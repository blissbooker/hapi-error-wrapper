'use strict';

var Lab = require('lab');
var Hapi = require('hapi');
var Boom = require('boom');

var ValidationError = require('mongoose/lib/error').ValidationError;

var plugin = require('../');

var lab = exports.lab = Lab.script();

lab.experiment('Spike solution', function () {

    var server;

    lab.before(function (done) {

        server = Hapi.createServer();

        server.route({
            path: '/validation',
            method: 'GET',
            handler: function (request, reply) {
                return reply(new ValidationError({}));
            }
        });

        server.route({
            path: '/native',
            method: 'GET',
            handler: function (request, reply) {
                return reply(Boom.resourceGone());
            }
        });

        server.route({
            path: '/internal',
            method: 'GET',
            handler: function (request, reply) {
                return reply(Boom.internal());
            }
        });

        server.route({
            path: '/',
            method: 'GET',
            handler: function (request, reply) {
                return reply();
            }
        });

        server.pack.register({
            plugin: plugin,
            options : {
                wrap: function (error, callback) {
                    if (error instanceof ValidationError) {
                        return callback(null, true, error.message);
                    }

                    return callback(null, false);
                }
            }
        }, done);
    });

    lab.test('returns preconcondition error if there is a mongoose validation error', function (done) {

        var request = {
            url: '/validation',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Lab.expect(response.statusCode).to.equal(412);

            return done();
        });
    });

    lab.test('returns native application errors', function (done) {

        var request = {
            url: '/native',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Lab.expect(response.statusCode).to.equal(410);

            return done();
        });
    });

    lab.test('returns other internal server errors', function (done) {

        var request = {
            url: '/internal',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Lab.expect(response.statusCode).to.equal(500);

            return done();
        });
    });

    lab.test('returns result if there are no errors', function (done) {

        var request = {
            url: '/',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Lab.expect(response.statusCode).to.equal(200);

            return done();
        });
    });
});
