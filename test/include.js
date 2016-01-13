'use strict';

var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var Boom = require('boom');

var ValidationError = require('mongoose/lib/error').ValidationError;

var plugin = require('../');

var lab = exports.lab = Lab.script();

lab.experiment('The server extension, considering client issues', function () {

    var server;

    lab.before(function (done) {

        server = new Hapi.Server();
        server.connection();

        server.route({
            path: '/validation/{param}',
            method: 'GET',
            handler: function (request, reply) {
                return reply(new ValidationError({}));
            }
        });

        server.route({
            path: '/native/{param}',
            method: 'GET',
            handler: function (request, reply) {
                return reply(Boom.resourceGone());
            }
        });

        server.route({
            path: '/internal/{param}',
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

        server.register({
            register: plugin,
            options : {
                wrap: function (error, callback) {

                    if (error instanceof ValidationError) {
                        var wrapped = Boom.preconditionFailed(error.message);
                        return callback(null, wrapped);
                    }

                    return callback(null, error);
                }
            }
        }, done);
    });

    lab.experiment('when there are errors', function () {

        lab.experiment('for mongoose validation errors', function () {

            lab.test('should return precondition failed error to the client', function (done) {

                server.inject('/validation/value', function (response) {
                    Code.expect(response.statusCode).to.equal(412);
                    return done();
                });
            });
        });

        lab.experiment('for expected application errors', function () {

            lab.test('should return the specific error to the client', function (done) {

                server.inject('/native/value', function (response) {
                    Code.expect(response.statusCode).to.equal(410);
                    return done();
                });
            });
        });

        lab.experiment('for unexpected or internal server errors', function () {

            lab.test('should return generic error to the client', function (done) {

                server.inject('/internal/value', function (response) {
                    Code.expect(response.statusCode).to.equal(500);
                    return done();
                });
            });
        });
    });

    lab.experiment('when there are no errors', function () {

        lab.test('should return control to the server', function (done) {

            server.inject('/', function (response) {

                Code.expect(response.statusCode).to.equal(200);

                return done();
            });
        });
    });
});
