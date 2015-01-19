'use strict';

var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var Boom = require('boom');
var Sinon = require('sinon');

var airbrake = require('airbrake');

var ValidationError = require('mongoose/lib/error').ValidationError;

var plugin = require('../');

var lab = exports.lab = Lab.script();

lab.experiment('The server extension handles', function () {

    var server, clientStub, notifySpy, exceptionSpy;

    var config = {
        airbrake: {
            host: 'http://127.0.0.1',
            key: 'airbrake_key'
        }
    };

    lab.before(function (done) {

        server = Hapi.createServer();

        var api = {
            notify: function (err, fn) {
                Code.expect(err).to.exist();
                Code.expect(fn).to.not.exist();
            },

            handleExceptions: function () {}
        };

        clientStub = Sinon.stub(airbrake, 'createClient').returns(api);

        notifySpy = Sinon.spy(api, 'notify');
        exceptionSpy = Sinon.spy(api, 'handleExceptions');

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
                },

                track: config.airbrake
            }
        }, done);
    });

    lab.after(function (done) {

        exceptionSpy.restore();
        notifySpy.restore();
        clientStub.restore();

        return done();
    });

    lab.experiment('for mongoose validation errors', function () {

        lab.test('should return precondition failed error to the client and track on airbrake server', function (done) {

            server.inject('/validation', function (response) {

                Code.expect(response.statusCode).to.equal(412);
                Code.expect(clientStub.calledOnce).to.be.true();
                Code.expect(notifySpy.calledOnce).to.be.true();
                Code.expect(exceptionSpy.calledOnce).to.be.true();

                return done();
            });
        });
    });

    lab.experiment('for expected application errors', function () {

        lab.test('should return the specific error to the client and track on airbrake server', function (done) {

            server.inject('/native', function (response) {

                Code.expect(response.statusCode).to.equal(410);
                Code.expect(clientStub.calledOnce).to.be.true();
                Code.expect(notifySpy.calledOnce).to.be.true();
                Code.expect(exceptionSpy.calledOnce).to.be.true();

                return done();
            });
        });
    });

    lab.experiment('for unexpected or internal server errors', function () {

        lab.test('should return generic error to the client and track on airbrake server', function (done) {

            server.inject('/internal', function (response) {

                Code.expect(response.statusCode).to.equal(500);
                Code.expect(clientStub.calledOnce).to.be.true();
                Code.expect(notifySpy.calledOnce).to.be.true();
                Code.expect(exceptionSpy.calledOnce).to.be.true();

                return done();
            });
        });
    });

    lab.experiment('for the case when there are no errors', function () {

        lab.test('should return control to the server', function (done) {

            server.inject('/', function (response) {

                Code.expect(response.statusCode).to.equal(200);
                Code.expect(clientStub.calledOnce).to.be.true();
                Code.expect(notifySpy.calledOnce).to.be.true();
                Code.expect(exceptionSpy.calledOnce).to.be.true();

                return done();
            });
        });
    });
});
