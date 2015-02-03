'use strict';

// This variable is required to mock the airbrake server
process.env.AIRBRAKE_SERVER = 'airbrake.host.com';

// Sample variables to test cgi-data filtering
process.env.VAR_1 = 1;
process.env.VAR_2 = 2;
process.env.VAR_3 = 3;

var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var Boom = require('boom');

var libxmljs = require('libxmljs');

var nock = require('nock');

var utils = require('./utils');
var ValidationError = require('mongoose/lib/error').ValidationError;

var plugin = require('../');

var lab = exports.lab = Lab.script();

lab.experiment('The server extension, ignoring client issues', function () {

    var server, config;

    lab.before(function (done) {

        config = {
            airbrake: {
                host: 'http://airbrake.host.com',
                key: 'airbrake_key',
                hidden: ['VAR_1', 'VAR_2']
            }
        };

        server = new Hapi.Server();
        server.connection();

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
                },

                track: config.airbrake
            }
        }, done);
    });

    lab.experiment('when there are errors', function () {

        var mock;
        var path = '/notifier_api/v2/notices';

        lab.experiment('for mongoose validation errors', function () {

            lab.test('should return precondition failed error to the client but not track on airbrake server', function (done) {

                server.inject('/validation', function (response) {

                    Code.expect(response.statusCode).to.equal(412);
                    return done();
                });
            });
        });

        lab.experiment('for expected application errors', function () {

            lab.test('should return the specific error to the client but not track on airbrake server', function (done) {

                server.inject('/native', function (response) {

                    Code.expect(response.statusCode).to.equal(410);
                    return done();
                });
            });
        });

        lab.experiment('for unexpected or internal server errors', function () {

            lab.test('should return generic error to the client and track on airbrake server', function (done) {

                var request = '/internal/value';

                var expected = {
                    endpoint: request,
                    hidden: config.airbrake.hidden
                };

                var mock = nock(config.airbrake.host)
                    .filteringRequestBody(utils.verify(expected))
                    .post(path, '*')
                    .reply(200);

                server.inject(request, function (response) {

                    Code.expect(response.statusCode).to.equal(500);
                    mock.done();

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
