/* global it expect spyOn describe beforeEach jasmine */
const nock = require('nock');

describe('TestsRunner', () => {
    let testRunner, TestsRunnerClass;
    const testConfig = [{
        'type': 'request',
        'options': {
            'method': 'GET',
            'url': 'https://restcountries.eu/rest/v2/name/Poland',
            'json': true
        },
        'tests': [{
            'type': 'regexp',
            'key': 'result.name',
            'value': 'Poland'
        }]
    }, {
        'type': 'delay',
        'time': 10
    }];

    beforeEach(() => {
        TestsRunnerClass = require('../lib/TestsRunner.js');
        testRunner = new TestsRunnerClass({silentMode: false});
    });

    it('run method should return resolved promise with statistics', (done) => {
        spyOn(testRunner, 'processRequest').andCallFake(() => { return Promise.resolve(); });
        spyOn(testRunner, 'processDelay').andCallFake(() => { return Promise.resolve(); });
        testRunner.run(testConfig).then(function(result) {
            expect(testRunner.processRequest).toHaveBeenCalled();
            expect(testRunner.processDelay).toHaveBeenCalled();
            expect(Object.keys(result) === Object.keys(testRunner.statistics));
            done();
        });
    });

    it('printLog method should call console.info when silent mode is disabled', () => {
        // mock of console.info
        console.info = jasmine.createSpy('info');
        testRunner.printLog('hello');
        expect(console.info).toHaveBeenCalledWith('hello');
    });

    it('printLog method should not call console.info when silent mode is disabled', () => {
        // mock of console.info
        testRunner = new TestsRunnerClass({silentMode: true});
        console.info = jasmine.createSpy('info');
        testRunner.printLog('hello');
        expect(console.info).not.toHaveBeenCalled();
    });

    it('processRequest method should call tests on response when response ready', (done) => {
        spyOn(testRunner, 'fillTemplateWithData').andCallFake(() => { return {url: 'http://tests.pl/test'}; });
        testRunner.resetStatistics();
        nock('http://tests.pl').get('/test').reply(200, {body: 'Hello'});

        // mock testing method
        spyOn(testRunner, 'runTestsOnResponse').andCallFake(() => { return Promise.resolve(); });

        testRunner.processRequest(testConfig[0]).then((result) => {
            expect(testRunner.fillTemplateWithData).toHaveBeenCalled();
            expect(testRunner.runTestsOnResponse).toHaveBeenCalled();
            done();
        });
    });

    it('processRequest method should retry request when test failed and retry option passed', (done) => {
        spyOn(testRunner, 'fillTemplateWithData').andCallFake(() => { return {url: 'http://tests.pl/test'}; });
        testRunner.resetStatistics();
        const scope = nock('http://tests.pl').get('/test').reply(500, {}).get('/test').reply(200, {});

        //set retry option
        testConfig[0]['retries'] = 1;

        // mock testing method
        spyOn(testRunner, 'runTestsOnResponse').andCallFake(() => { return Promise.reject(new Error('failed')); });

        testRunner.processRequest(testConfig[0]).catch((result) => {
            expect(scope.isDone()).toEqual(true);
            done();
        });
    });


    it('processRequest method should not retry request when test passed', (done) => {
        spyOn(testRunner, 'fillTemplateWithData').andCallFake(() => { return {url: 'http://tests.pl/test'}; });
        testRunner.resetStatistics();
        const scope = nock('http://tests.pl').get('/test').reply(200, {});

        //set retry option
        testConfig[0]['retries'] = 1;

        // mock testing method
        spyOn(testRunner, 'runTestsOnResponse').andCallFake(() => { return Promise.resolve('ok'); });

        testRunner.processRequest(testConfig[0]).then((result) => {
            expect(scope.isDone()).toEqual(true);
            done();
        });
    });

    it('processDelay method should resolve after timeout', (done) => {
        testRunner.processDelay(6).then((result) => {
            done();
        });
    });

    it('runTestsOnResponse method should reject Promise when status code >= 400', (done) => {
        testRunner.runTestsOnResponse(testConfig[0]['tests'], {statusCode: 400}, {}).catch((error) => {
            expect(error.message).toEqual('Response status code: 400');
            done();
        });
    });

    it('runTestsOnResponse method should resolve Promise when status code is OK', (done) => {
        testRunner.runTestsOnResponse([], {statusCode: 200, body: {test: 'test'}}).then((result) => {
            expect(result).toEqual({test: 'test'});
            done();
        });
    });

    it('runTestsOnResponse method should handle properly tests on correct response', (done) => {
        const body = {result: {name: 'Poland'}};
        testRunner.runTestsOnResponse(testConfig[0]['tests'], {statusCode: 200, body: body})
            .then((result) => {
                expect(result).toEqual(body);
                done();
            });
    });

    it('runTestsOnResponse method should handle properly tests on incorrect response', (done) => {
        const body = {result: {name: 'Sth'}};
        testRunner.runTestsOnResponse(testConfig[0]['tests'], {statusCode: 200, body: body})
            .catch(() => {
                done();
            });
    });

    it('fillTemplateWithData method should insert data in place of variables', () => {
        const testData = {
            body: {
                testKey: '${response[0].testValue}'
            }
        };
        testRunner.responseStack = [{testValue: 'testValue'}];
        const result = testRunner.fillTemplateWithData(testData);
        expect(result).toEqual({
            body: {
                testKey: 'testValue'
            }
        });
    });
});
