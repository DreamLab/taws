# Taws - simple tester of your http respones


*Application that run tests suite on http request responses*


### Usage


1. Install Taws in your project
   `$ npm intall taws`
2. Copy & paste below code
```js
    const { TestsRunner } = require('taws');
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
    let promiseChain = runner.run(params.config);
    
    promiseChain
        .then((result) => {
            console.info('TEST - %s - name=%s tests_overall=%s tests_failed=%s duration=%s ms',
                result.testsSuiteId,
                params.name,
            result.testsRun,
                result.testsFail,
            result.endTime - result.startTime
            )
        })
        .catch((error) => {
            console.error(error);
    });
```

3. Run your code with node>6.x.x

By default, logging of processing tests is enabled, if you want to disable this,
pass object with `silentModel` property set to true  to `TestRunner` constructor.

```js
    //example tests suite configuration
    const options={
        silentMode: true
    };
    
    const runner = new TestsRunner(options);
```


### Tests suite definition

Taws `TestsRunner` *run* method accepts tests suite to run. 

*Example of tests suite definition:*
 
```json
{
    "name" : "pulse2story_save",
    "config" : [{
            "type" : "request",
            "options" : {
                "method" : "GET",
                "url" : "https://restcountries.eu/rest/v2/name/Poland",
                "headers" : {
                    "cache-control" : "no-cache"
                },
                "body" : {
                    "data" : "hello"
                }
            },
            "tests" : [{
                    "type" : "regexp",
                    "key" : "[0].name",
                    "value" : "Poland"
                }
            ]
        },
        {
            "type": "delay",
            "time": 6000
        }
    ]
}
```
Tests suite consists of two keys: `name` and `config`

`name` is a name of tests suite
`config` is a set of action definitions to perform within the tests suite. See [action-definition](#action-definition) for more information.

#### Action definition

Tests suite configuration consist of actions that are executed synchronously in defined order.
 
 There are two types of actions to use
1. `request` type - run http request
    
    Requires `options` key with request definition ( see https://github.com/request/request)
    
    ```json
     {
         "type" : "request",
         "options" : {
             "method" : "GET",
             "url" : "http://go-lists-proxy.pulse2.cloudint.onet/api/sections/e10207a7-6623-4740-bb33-9344d92a52ed/b0c0dd25-d129-4f95-9ffb-04064106627d",
             "headers" : {
                 "cache-control" : "no-cache",
                 "x-pulse2-sessionid" : "1340b1be-a24b-4ad7-9590-270a9b723a47",
                 "cookie" : "pulse2-sessionId=1340b1be-a24b-4ad7-9590-270a9b723a47"
             },
             "body" : {
                 "data" : {
                     "config" : {
                         "link_url" : null,
                         "elements_published" : 3,
                         "display_title" : "sample section 9"
                     }
                 }
             }
         }
     }
    ```
    
    This action accepts a tests definition to run on a response of request.
    
    See [test-definition](#test-definition) section. 
    
2. `delay` type - wait specified time before executing next action
    
    Requires `time` key with number of miliseconds to wait
    
    ```json
     {
         "type": "delay",
         "time": 6000
     }
    ```
    
##### Tests definition
    
Every "request" step allows to specify tests, that will be run in order to check correctness of the response. Tests property is an array, where every object represents one condition.

*Example*:
```
    "tests" : 
    [{
        "type" : "regexp",
        "key" : "[0].name",
        "value" : "Poland"
        }, {
        "type" : "regexp",
        "key" : "[0].capital",
        "value" : "Warsaw"
        }, {
        "type" : "regexp",
        "key" : "[0].region",
        "value" : "(Europe|europe)"
        }]
```
    
Single test definition consist of following key:
    
`type` - Type of test. Only `regexp` type is available.
`key` - Path in response's object, which value will be tested against regexp
`value` -  Regexp to test the value.

---

#### Accessing responses of previous requests

Every request action and tests definition can use data from previous requests response.
Responses of previous requests are available under `response[index]` variable, where `index`
corresponds to requests order. 

For example, to access response of first request use `response[0]` variable, for second `response[1]` etc..

Below you find common use examples:

*Using `name` key from response of first request in URL of the next*
```json
     {
         "type" : "request",
         "options" : {
             "method" : "GET",
             "url" : "https://restcountries.eu/rest/v2/name/${response[0].name}",
             "headers" : {
                 "cache-control" : "no-cache"
             },
             "body" : {}
         }
     }
```
#### Validating tests suite

To validate tests suite definition, `validateConfig` method is available.

Arguments:

`testConfig` - test suite definition
`throwError` - decides if excepion should be trowed when validation of tests suite fail

*Example*:
```js
     try {
         validateConfig(testConfig, true);
     } catch (error) {
         console.warn('Schema validation error:', error);
     }
```
