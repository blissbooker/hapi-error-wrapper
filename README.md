# hapi-error-wrapper

Hapi.js plugin to wrap and track application errors.

[![Build Status](https://travis-ci.org/blissbooker/hapi-error-wrapper.svg)](https://travis-ci.org/blissbooker/hapi-error-wrapper)
[![Dependency Status](https://gemnasium.com/blissbooker/hapi-error-wrapper.svg)](https://gemnasium.com/blissbooker/hapi-error-wrapper)

## Usage

```javascript
var Hapi = require('hapi');
var Boom = require('boom');

var ValidationError = require('mongoose/lib/error').ValidationError;

var plugin = require('hapi-error-wrapper');

var server = new Hapi.Server();
server.connection({ port: 1337 });

server.register({
    plugin: plugin,
    register: {
        // Wrap component-specific error
        // e.g. Mongoose Validation Errors
        wrap: function (error, callback) {

            if (error instanceof ValidationError) {
                var wrapper = Boom.preconditionFailed(error.message);
                return callback(null, wrapped);
            }

            return callback(null, error);
        },

        // Track errors on an airbrake server
        track: {
            key: '<application_id>',
            host: '<airbrake_server>'
        }
    }
}, function (err) {
    // whatevs
});
```
