'use strict';

var Boom = require('boom');
var airbrake = require('airbrake');

var internals = {};

internals.filter = function (hidden) {

    return function (type, vars) {

        hidden || (hidden = []);

        if (type === 'cgi-data') {
            hidden.forEach(function (variable) {
                delete vars[variable];
            });
        }
    };
};

internals.parse = function (client, fn) {

    return function (err, isPreconditionError, error) {

        if (err) {
            client && client.notify(err);
            return fn(err);
        }

        if (error) {
            client && client.notify(error);
        }

        if (isPreconditionError) {
            return fn(Boom.preconditionFailed(error.message));
        }

        return fn();
    };
};

internals.handler = function (options) {

    var client;

    if (options.track && options.track.key && options.track.host) {

        var config = options.track;

        client = airbrake.createClient(config.key);
        client.on('vars', internals.filter(config.hidden));
        client.host = config.host;
        client.handleExceptions();
    }

    return function (request, reply) {

        var response = request.response;

        if (options.wrap && response.output && response.output.statusCode >= 400) {
            return options.wrap(response, internals.parse(client, reply));
        }

        return reply();
    };
};

exports.register = function (plugin, options, next) {

    plugin.ext('onPreResponse', internals.handler(options));
    return next();
};

exports.register.attributes = {
    name: 'hapi-error-wrapper',
    version: '0.1.0'
};
