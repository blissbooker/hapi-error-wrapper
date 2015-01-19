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

    var server, stub, spy;

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
            }
        };

        stub = Sinon.stub(airbrake, 'createClient').returns(api);
        spy = Sinon.spy(api, 'notify');

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

                log: {
                    airbrake: config.airbrake
                }
            }
        }, done);
    });

    lab.after(function (done) {

        spy.restore();
        stub.restore();

        return done();
    });

    lab.experiment('for mongoose validation errors', function () {

        lab.test('should return precondition failed error to the client and log to airbrake', function (done) {

            server.inject('/validation', function (response) {

                Code.expect(response.statusCode).to.equal(412);
                Code.expect(stub.calledOnce).to.be.true();
                Code.expect(spy.calledOnce).to.be.true();

                return done();
            });
        });
    });

    lab.experiment('for expected application errors', function () {

        lab.test('should return the specific error to the client and log to airbrake', function (done) {

            server.inject('/native', function (response) {

                Code.expect(response.statusCode).to.equal(410);
                Code.expect(stub.calledOnce).to.be.true();
                Code.expect(spy.calledOnce).to.be.true();

                return done();
            });
        });
    });

    lab.experiment('for unexpected or internal server errors', function () {

        lab.test('should return generic error to the client and log to airbrake', function (done) {

            server.inject('/internal', function (response) {

                Code.expect(response.statusCode).to.equal(500);
                Code.expect(stub.calledOnce).to.be.true();
                Code.expect(spy.calledOnce).to.be.true();

                return done();
            });
        });
    });

    lab.experiment('for the case when there are no errors', function () {

        lab.test('should return control to the server', function (done) {

            server.inject('/', function (response) {

                Code.expect(response.statusCode).to.equal(200);
                Code.expect(stub.calledOnce).to.be.true();
                Code.expect(spy.calledOnce).to.be.true();

                return done();
            });
        });
    });
});
