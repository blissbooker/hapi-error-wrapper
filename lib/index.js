'use strict';

var Boom = require('boom');

exports.register = function (plugin, options, next) {

    plugin.ext('onPreResponse', function (request, reply) {
        if (options.wrap && request.response.output && request.response.output.statusCode === 500) {
            options.wrap(request.response, function (err, isPreconditionError, message) {
                if (err) {
                    return reply(err);
                }

                if (isPreconditionError) {
                    return reply(Boom.preconditionFailed(message));
                }

                return reply();
            });
        }

        return reply();
    });

    return next();
};

exports.register.attributes = {
    name: 'hapi-error-wrapper',
    version: '0.0.1'
};
