'use strict';

var Boom = require('boom');
var airbrake = require('airbrake');

var internals = {};

internals.handler = function (options) {

    var client;

    if (options.track && options.track.key && options.track.host) {

        var config = options.track;
        client = airbrake.createClient(config.key);
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

            return reply(err);
        };

        var _parse = function (err, isPreconditionError, message) {

            if (err) {
                return _submit(err);
            }

            if (isPreconditionError) {
                return _submit(Boom.preconditionFailed(message));
            }

            return reply();
        };

        if (options.wrap && response.output && response.output.statusCode === 500) {
            options.wrap(response, _parse);
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
