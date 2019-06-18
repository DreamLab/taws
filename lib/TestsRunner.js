const _ = require('lodash');
const request = require('request');

/**
 * Runs defined tests, collect statistics
 * @constuctor
 * @param {object} options test runner configuration object
 * @param {string} options.requestId test identifier which will be 
 * @param {boolean} options.silentMode
 */
class TestsRunner {
    constructor(options = {}) {
        this.responseStack = [];
        const defaults = {
            silentMode: false
        };
        this.options = Object.assign({}, defaults, options);
        this.requestId = options.requestId;
    }

    /**
     * Runs given tests configuration
     * @param {Object[]} config Array with tests configuration eg. [{
            "type" : "request",
            "options" : {
                "method" : "GET",
                "url" : "https://restcountries.eu/rest/v2/name/Poland",
                "headers" : {}
            },
            "tests" : [{
                "type" : "regexp",
                "key" : "[0].name",
                "value" : "Poland"
            }]
        }] 
     */
    run(config) {
        this.responseStack = [];
        this.resetStatistics();
        let promiseChain = Promise.resolve();

        config.forEach((item) => {
            switch (item.type) {
                case 'request': {
                    promiseChain = promiseChain.then(this.processRequest.bind(this, item));
                    break;
                }
                case 'delay': {
                    promiseChain = promiseChain.then(this.processDelay.bind(this, item.time));
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
     * @param  {string} message Text which will be printed
     */
    printLog(message) {
        if (!this.options.silentMode) {
            console.info(this.decorateMessageWithRequestId(message));
        }
    }

    throwError(message) {
        return new Error(this.decorateMessageWithRequestId(message))
    }

    decorateMessageWithRequestId(message) {
        return this.requestId
            ? `[${this.requestId}] ${message}`
            : message;
    }

    /**
     * Runs request and specified tests on it's response
     * @param  {Object} config Configuration of request
     * @param  {Object} config.options Options for "request" library
     * @param  {Object} config.tests Tests to run on response
     */
    processRequest(config) {
        return new Promise((resolve, reject) => {
            this.statistics.testsRun++;
            const options = this.fillTemplateWithData(config.options);
            const tests = this.fillTemplateWithData(config.tests);
            const responseStackIndex = this.responseStack.length;
            let retriesCount = 0;

            this.printLog(`Running request to ${options.url}`);

            const canRetry = () => {
                return !!(config.retries && retriesCount < config.retries);
            };

            const retryRequest = () => {
                retriesCount++;
                this.printLog(`Retrying request to ${options.url} (retry ${retriesCount})`);
                request(options, processResponse);
            };

            const processResponse = (error, response) => {
                if (error) {
                    if(canRetry()) {
                        retryRequest();
                        return;
                    } else {
                        this.statistics.testsFail++;
                        return reject(new Error(error));
                    }
                }
                this.printLog(`Got response of request to ${options.url}`);

                // add response to responses stack
                this.responseStack[responseStackIndex] = response.body;

                // tests
                this.printLog('Running tests on the response...');
                this.runTestsOnResponse(tests, response)
                    .then((res) => {
                        resolve(res);
                        this.statistics.testsSuccess++;
                    })
                    .catch((error) => {
                        if(canRetry()) {
                            retryRequest();
                        } else {
                            this.statistics.testsFail++;
                            return reject(new Error(error));
                        }
                    });
            };

            request(options, processResponse);
        });
    }


    /**
     * Returns a promise that resolves after specified time
     * @param  {number} time Time in miliseconds
     */
    processDelay(time) {
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
