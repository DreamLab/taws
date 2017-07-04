
const TestsRunner = require('./../lib/TestsRunner');

//example tests suite configuration
const params = {
    "name" : "example_tests_suite",
    "config" : [{
        "type" : "request",
        "options" : {
            "method" : "GET",
            "url" : "https://restcountries.eu/rest/v2/name/Poland",
            "headers" : {},
            "json": true,
            "body" : {}
        },
        "tests" : [{
            "type" : "regexp",
            "key" : "[0].name",
            "value" : "Poland"
        }]
    }]
};

const runner = new TestsRunner();
runner.run(params.config).then((result) => {
    console.info('TEST result: name=%s tests_overall=%s tests_failed=%s duration=%s ms',
        params.name,
        result.testsRun,
        result.testsFail,
        result.endTime - result.startTime
    )
}).catch((error) => {
    console.error(error);
});
