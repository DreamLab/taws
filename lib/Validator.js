const validateSchema = require('jsonschema').validate;
const schema = require('./schema/RunTestMethodSchema.json');

/**
 * Validates test configuration
 * @param testConfig
 * @param throwError {boolean} Decides if possible errors should be returned or throwed as exceptions
 * @throws {TypeError}
 * @returns {boolean}
 */
function validateConfig(testConfig, throwError) {
    return validateSchema(testConfig, schema, { throwError: throwError });
}

exports = module.exports = validateConfig;
