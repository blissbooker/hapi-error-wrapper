'use strict';

var Code = require('code');
var libxmljs = require('libxmljs');

exports.verify = function (expected) {

    return function (payload) {

        var doc = libxmljs.parseXml(payload);

        var environment = doc.get('//cgi-data');
        var variables = environment.childNodes().map(function (node) {
            return node.attr('key').value();
        });

        Code.expect(variables).to.not.include(expected.hidden);

        var endpoint = doc.get('request/url').text().toString();
        Code.expect(endpoint).to.endWith(expected.endpoint);

        var params = doc.get('//params');
        params.childNodes().forEach(function (node) {

            var attribute = node.attr('key').value();
            Code.expect(attribute).to.equal('param');

            var value = node.text();
            Code.expect(value).to.equal('value');
        });

        return '*';
    };
};
