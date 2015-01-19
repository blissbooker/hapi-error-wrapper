'use strict';

var Boom = require('boom');

var internals = {};

internals.handler = function (options) {

    return function (request, reply) {

        var response = request.response;

        var done = function (err, isPreconditionError, message) {
            if (err) {
                return reply(err);
            }

            if (isPreconditionError) {
                return reply(Boom.preconditionFailed(message));
            }

            return reply();
        };

        if (options.wrap && response.output && response.output.statusCode === 500) {
            options.wrap(response, done);
        }

        return reply();
    }
}

exports.register = function (plugin, options, next) {

    plugin.ext('onPreResponse', internals.handler(options));
    return next();
};

exports.register.attributes = {
    name: 'hapi-error-wrapper',
    version: '0.1.0'
};
