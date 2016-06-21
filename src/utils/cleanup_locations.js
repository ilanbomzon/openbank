var request = require('request');
var Promise = require('bluebird');

const baasUrl = 'https://api.usergrid.com/psubrahmanyam/apisbank';
const clientId = 'YXA63Lg0wPGcEeWWGU22BWEsKg';
const clientSecret = 'YXA6rMgCcOBVexNnPxFqIY3S-HbVrR0';

function getToken() {
    return new Promise(function (resolve, reject) {
        console.log('Getting access token from BaaS');

        var options = {
            uri: baasUrl + '/token',
            method: 'POST',
            form: {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            },
            json: true
        };

        request(options, function (err, resp, body) {
            if (err)
                reject(err);

            if (resp.statusCode >= 400)
                reject(resp.statusCode);

            resolve(body.access_token);
        });
    });
}

function getLocations(token, cursor, locations) {
    return new Promise(function (resolve, reject) {
        console.log('getting locations with cursor ' + cursor);

        if (!locations) {
            locations = [];
        }

        var options = {
            uri: baasUrl + '/locations',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            json: true
        };

        if (cursor) {
            options.qs = {
                cursor: cursor
            };
        }

        request(options, function (err, resp, body) {
            if (err)
                return reject(err);

            if (body.entities && body.entities.length === 0)
                resolve({
                    token: token,
                    locations: locations
                });

            for (var i = 0; i < body.entities.length; i++) {
                var location = body.entities[i];

                /*
                if (!location.hasOwnProperty('lat') || !location.hasOwnProperty('long'))
                    continue;

                location.location = {
                    latitude: location.lat,
                    longitude: location.long
                };

                 location.lat = null;
                 location.long = null;
                 */

                delete location.created;
                delete location.modified;
                delete location.metadata;
                delete location.type;
                delete location.uuid;

                location.resources = {
                    atm: (Math.random() * 10) > 4,
                    branch: (Math.random() * 10) < 4
                };

                locations.push(location);
            }

            if (body.cursor) {
                console.log('cursor obtained, recursing...');
                getLocations(token, body.cursor, locations)
                    .then(function (loc) {
                        resolve({
                            token: token,
                            locations: loc.locations
                        });
                    })
            } else {
                console.log('no more cursor; resolving...');
                resolve({
                    token: token,
                    locations: locations
                });
            }
        });
    });
}

function saveLocations(data) {
    return new Promise(function (resolve, reject) {
        console.log('saving all locations');

        var locations = data.locations;
        var token = data.token;

        // console.log('locations = ' + JSON.stringify(locations, null, 2));

        if (!locations) {
            reject('EMPTY Locations');
        }

        Promise.map(locations, function (location) {
                return updateLocation(token, location);
            })
            .finally(function () {
                resolve();
            });
    });
}

function updateLocation(token, location) {
    return new Promise(function (resolve, reject) {
        console.log('saving locations ' + location.name);

        var options = {
            uri: baasUrl + '/locations/' + location.name,
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            json: location
        };

        request(options, function (err, resp) {
            if (err)
                return reject(err);

            if (resp.statusCode >= 400) {
                return reject(resp.statusCode);
            }

            resolve(resp.statusCode);
        });
    });
}

function main() {
    getToken()
        .then(getLocations)
        .then(saveLocations)
        .then(function () {
            console.log('done');
        })
        .catch(function (err) {
            console.log('error = ' + err);
        })
}

main();