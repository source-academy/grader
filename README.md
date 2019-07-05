# Source Academy Autograder Component

[![Build_status](https://travis-ci.org/source-academy/grader.svg?branch=master)](https://travis-ci.org/source-academy/grader)
[![Coverage](https://coveralls.io/repos/github/source-academy/grader/badge.svg?branch=master)](https://coveralls.io/github/source-academy/grader?branch=master)

The grader is a component of the [Cadet backend](https://github.com/source-academy/cadet). The grader,

1. Receives a JSON format from the backend,
2. For each test case program,

    1. Concatenate all the program strings into a single combined program
    2. Evaluates the single combined program in the [js-slang](https://github.com/source-academy/js-slang) interpreter
    
3. Returns a `Summary` JSON containing the results of the evaluation of the student code


## Input JSON format

The input format consists of library, prepend, student, postpend, and testcases fields.

Example input:
```JSON
{
  "library": {
    "chapter": 1,
    "external": {
      "name": "NONE",
      "symbols": []
    },
    "globals": []
  },
  "prependProgram": "// This line will be ignored",
  "studentProgram": "const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2);",
  "postpendProgram": "// This line will also be ignored",
  "testCases": [
    {
      "program": "f(1);",
      "answer": "1",
      "score": 1
    },
    {
      "program": "f(3);",
      "answer": "2",
      "score": 1
    },
    {
      "program": "f(5);",
      "answer": "5",
      "score": 1
    }
  ]
}
```

The programs are programs written in [the source language](https://github.com/source-academy/js-slang). 

Each test case consists of the prepend, student, postpend and testcase program concatenated in that order.

For example, testcase 1 will look like:
```javascript
// This line will be ignored
const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2);
// This line will also be ignored
f(1);
```

## Output `Summary` Format
The grader will produce a `Summary` for every input. The `Summary` will be an array of `Result`, with each testcase producing one `Result`. The format of the `Result` are as follows:
### Example: Correct Answer

The student's code is correct.

The grader's corresponding `Summary` format will look like this:

```json
{   
    "totalScore": 3,
    "results": [
        {
            "resultType": "pass",
            "score": 1
        },
        {
            "resultType": "pass",
            "score": 1
        },
        {
            "resultType": "pass",
            "score": 1
        }
    ]
}
```

Note that the `resultType` pass represents any successful evaluation, i.e. no errors raised.

### Example: Wrong Answer

The student's code is wrong.

The grader's corresponding `Summary` format will look like this:

```json
{
    "totalScore": 0,
    "results": [
        {
            "resultType": "fail",
            "expected": "1",
            "actual": "2"
        },
        {
            "resultType": "fail",
            "expected": "2",
            "actual": "3"
        },
                {
            "resultType": "fail",
            "expected": "5",
            "actual": "8"
        }
    ]
}
```

### Example: Error in the code
The student's code has a syntax error.

The grader's corresponding `Summary` format will look like this:
```JSON
{
  "totalScore": 0,
  "results": [
    {
      "resultType": "error",
      "errors": [
        {
          "errorType": "syntax",
          "line": 1,
          "location": "student",
          "errorLine": "const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2)",
          "errorExplanation": "Missing semicolon at the end of statement"
        }
      ]
    },
    {
      "resultType": "error",
      "errors": [
        {
          "errorType": "syntax",
          "line": 1,
          "location": "student",
          "errorLine": "const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2)",
          "errorExplanation": "Missing semicolon at the end of statement"
        }
      ]
    },
    {
      "resultType": "error",
      "errors": [
        {
          "errorType": "syntax",
          "line": 1,
          "location": "student",
          "errorLine": "const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2)",
          "errorExplanation": "Missing semicolon at the end of statement"
        }
      ]
    }
  ]
}
```

Other errors include timeout errors and runtime errors.