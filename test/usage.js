'use strict';

var Lab = require('lab');
var Hapi = require('hapi');
var Boom = require('boom');

var plugin = require('../');
var lab = exports.lab = Lab.script();
lab.experiment('register plugin', function () {

    var server;

    lab.before(function (done) {

        server = new Hapi.Server();
        server.connection();

        server.route({
            path: '/',
            method: 'GET',
            handler: function (request, reply) {
                return reply(new Error('ERROR'));
            }
        });

        server.register({
            register: plugin,
            options : {
                wrap: function (error, callback) {

                    if (error instanceof Error) {
                        var wrapped = Boom.preconditionFailed(error.message);
                        return callback(null, wrapped);
                    }

                    return callback(null, error);
                },
            }
        }, done);
    });

});
