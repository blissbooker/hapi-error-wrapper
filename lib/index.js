'use strict';

var url = require('url');
var airbrake = require('airbrake');

var internals = {};

internals.addContext = function (request, err) {

    err.url = url.format(request.url);
    err.params = request.params;
    err.session = request.session;

    return err;
};

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

internals.track = function (request, client, reply) {

    return function (err, data) {

        err || (err = data);

        if (err) {
            var verbose = internals.addContext(request, err);
            client && client.notify(verbose);

            return reply(err);
        }

        return reply.continue();
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

        if (options.wrap && response.output) {

            var clientErrors = options.track && options.track.clientErrors;
            if (clientErrors || response.output.statusCode >= 500) {

                var done = internals.track(request, client, reply);
                return options.wrap(response, done);
            }
        }

        return reply.continue();
    };
};

exports.register = function (plugin, options, next) {

    plugin.ext('onPreResponse', internals.handler(options));
    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
