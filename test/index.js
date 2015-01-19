'use strict';

var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var Boom = require('boom');

var ValidationError = require('mongoose/lib/error').ValidationError;

var plugin = require('../');

var lab = exports.lab = Lab.script();

lab.experiment('The hapi-error-wrapper server extension', function () {

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

    lab.test('should handle mongoose validation errors as a failed precondition', function (done) {

        var request = {
            url: '/validation',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Code.expect(response.statusCode).to.equal(412);

            return done();
        });
    });

    lab.test('should handle expected application errors with the proper code', function (done) {

        var request = {
            url: '/native',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Code.expect(response.statusCode).to.equal(410);

            return done();
        });
    });

    lab.test('should handle unexpected or internal server errors', function (done) {

        var request = {
            url: '/internal',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Code.expect(response.statusCode).to.equal(500);

            return done();
        });
    });

    lab.test('should return control to the server if there are no errors', function (done) {

        var request = {
            url: '/',
            method: 'GET'
        };

        server.inject(request, function (response) {
            Code.expect(response.statusCode).to.equal(200);

            return done();
        });
    });
});
