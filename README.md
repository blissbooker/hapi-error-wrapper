# hapi-error-wrapper

Hapi.js plugin to wrap and track application errors.

## Usage

```javascript
var Hapi = require('hapi');
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
                return callback(null, true, error.message);
            }

            return callback(null, false);
        },

        // Track errors on an airbrake server
        track: {
            airbrake: {
                key: '<application_id>',
                host: '<airbrake_server>'
            }
        }
    }
}, function (err) {
    // whatevs
});
```
