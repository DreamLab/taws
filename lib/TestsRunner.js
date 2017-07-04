const _ = require('lodash');
const request = require('request');

/**
 * Runs defined tests, collect statistics
 */
class TestsRunner {
    constructor(options = {}) {
        this.responseStack = [];
        const defaults = {
            silentMode: false
        };
        this.options = Object.assign({}, defaults, options);
    }

    /**
     * Runs given tests configuration
     * @param config
     */
    run(config) {
        this.responseStack = [];
        this.resetStatistics();
        let promiseChain = Promise.resolve();

        config.forEach((item) => {
            switch (item.type) {
                case 'request': {
                    promiseChain = promiseChain.then(this.runRequest.bind(this, item));
                    break;
                }
                case 'delay': {
                    promiseChain = promiseChain.then(this.runDelay.bind(this, item.time));
                    break;
                }
            }
        });

        // return statistics data
        promiseChain = promiseChain.then(() => {
            this.statistics.endTime = Date.now();
            return Promise.resolve(this.statistics);
        });

        return promiseChain;
    }

    /**
     * Resets statistics about ran tests
     */
    resetStatistics() {
        this.statistics = {
            startTime: Date.now(),
            endTime: null,
            testsRun: 0,
            testsFail: 0,
            testsSuccess: 0
        };
    }

    /**
     * Prints debug message if silentMode mode is off
     * @param message
     */
    printLog(message) {
        if (!this.options.silentMode) {
            console.info(message);
        }
    }

    /**
     * Runs request and specified tests on it's response
     * @param  {Object} config Configuration of request
     * @param  {Object} config.options Options for "request" library
     * @param  {Object} config.tests Tests to run on response
     */
    runRequest(config) {
        return new Promise((resolve, reject) => {
            this.statistics.testsRun++;
            const options = this.fillTemplateWithData(config.options);
            const tests = this.fillTemplateWithData(config.tests);

            this.printLog(`Running request to ${options.url}`);

            request(options, (error, response) => {
                if (error) {
                    return reject(new Error(error));
                }
                this.printLog(`Got response of request to ${options.url}`);

                // add response to responses stack
                this.responseStack.push(response.body);

                // tests
                this.printLog('Running tests on the response...');
                this.runTestsOnResponse(tests, response)
                    .then((res) => {
                        resolve(res);
                        this.statistics.testsSuccess++;
                    })
                    .catch((error) => {
                        reject(error);
                        this.statistics.testsFail++;
                    });
            });
        });
    }

    /**
     * Returns a promise that resolves after specified time
     * @param  {number} time Time in miliseconds
     */
    runDelay(time) {
        this.printLog(`Waiting ${time} ms...`);
        return new Promise((resolve) => {
            setTimeout(resolve, time);
        });
    }

    /**
     * Function to run specified tests against response.
     * @param  {Object} tests    Specified tests.
     * @param  {Object} response Http response.
     */
    runTestsOnResponse(tests, response) {
        try {
            if (!response.statusCode || response.statusCode >= 400) {
                throw new Error(`Response status code: ${response.statusCode}`);
            }
            const responseBody = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;

            tests.forEach((test) => {
                if (test.type === 'regexp') {
                    const regexp = new RegExp(test.value, 'g');
                    const value = _.get(responseBody, test.key);
                    if (!regexp.test(value)) {
                        throw new Error(`Test failed: "${test.key}" for regexp "${test.value}": response returned "${value}"`);
                    }
                    this.printLog(`Test(${test.type} type) on returned value(${value}) passed`);
                }
            });
            return Promise.resolve(responseBody);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Replaces all variables in data with proper values
     * @param {Object} data
     * @returns {Object} Structure ready to use in request library
     */
    fillTemplateWithData(data) {
        // select proper map function
        let map = _.isArray(data) ? _.map : _.mapValues;
        return map(data, (value) => {
            // run mapping function recursively on all values
            if (_.isObjectLike(value) && !_.isEmpty(value)) {
                return this.fillTemplateWithData(value);
            }
            // run template on non empty values only
            return !_.isEmpty(value) ? _.template(value)({response: this.responseStack}) : value;
        });
    }
}

module.exports = exports = TestsRunner;
