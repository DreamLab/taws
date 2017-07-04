/* global it describe */

const validateConfig = require('./../lib/Validator');

describe('Validator', () => {
    const invalidTestConfig = {};
    const validTestConfig = {
        'name': 'test',
        'config': [{
            'type': 'request',
            'options': {
                'method': 'POST',
                'url': 'https://restcountries.eu/rest/v2/name/Poland',
                'json': true
            },
            'tests': [{
                'type': 'regexp',
                'key': 'result.name',
                'value': 'Poland'
            }]
        }]
    };

    it('validateConfig should throw exception when testSuite config is invalid', (done) => {
        try {
            validateConfig(invalidTestConfig, true);
        } catch (error) {
            done();
        }
    });

    it('validateConfig should not throw exception when testSuite config is valid', (done) => {
        try {
            validateConfig(validTestConfig, true);
            done();
        } catch (error) {};
    });
});
