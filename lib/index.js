'use strict';

var Boom = require('boom');
var airbrake = require('airbrake');

var internals = {};

internals.filter = function (hidden) {

    return function (type, vars) {

        hidden || (hidden = []);

        if (type == 'cgi-data') {
            hidden.forEach(function (variable) {
                delete vars[variable];
            });
        }
    }
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

        var _submit = function (err) {

            if (client) {
                // submit error without stoping flow
                client.notify(err);
            }
        };

        var _parse = function (err, isPreconditionError, error) {

            if (err) {
                _submit(err);
            }

            if (error) {
                _submit(error);
            }

            if (isPreconditionError) {
                return reply(Boom.preconditionFailed(error.message));
            }

            return reply();
        };

        if (options.wrap && response.output && response.output.statusCode >= 400) {
            return options.wrap(response, _parse);
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
