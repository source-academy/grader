# Source Academy Autograder Component

[![Build_status](https://travis-ci.org/source-academy/grader.svg?branch=master)](https://travis-ci.org/source-academy/grader)
[![Coverage](https://coveralls.io/repos/github/source-academy/grader/badge.svg?branch=master)](https://coveralls.io/github/source-academy/grader?branch=master)

**The grader is still in development, API specficiations may change!**

The grader is a component of the [Cadet backend](https://github.com/source-academy/cadet). The grader,

1. Receives a combination of prepend, student and postpend program strings
2. For each test case program,

    1. Concatenate all the program strings into a single combined program
    2. Evaluates the single combined program in the [js-slang](https://github.com/source-academy/js-slang) interpreter
    
3. Returns a `Summary` JSON containing the results of the evaluation of the student code


## Grader Program

The grader programs are programs written in [the source language](https://github.com/source-academy/js-slang). 

- Each grader program will have access to the global scope of the student program,
- and that there is no restrictions to how the grader program is written

## Grader `Summary` Format
### Example: Correct Answer

For example, the student program may look like,

```javascript
function fib(n) {
    if (n <= 1) {
        return n;
    } else {
        return fib(n - 1) + fib(n - 2);
    }
} 
```

and the testcase program(s),

```javascript
fib(1);
```

The grader's corresponding `Summary` JSON output for this program is then,

```json
{   
    "totalScore": 1,
    "results": [
        {
            "resultType": "pass",
            "score": 1
        }
    ]
}
```

Note that the `resultType` pass represents any successful evaluation, i.e. no errors raised.

### Example: Wrong Answer

For example, the student program may look like,

```javascript
function fib(n) {
    if (n == 2) {
        return n;
    } else {
        return fib(n - 1) + fib(n - 2);
    }
}
```

and for the test case,

```javascript
fib(2);
```
and
```javascript
fib(1);
```

The grader's corresponding `Summary` JSON output for this function is then,

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
            "resultType": "error",
            "errors": [
                {
                "errorType": "timeout"
                }
            ]
        }
    ]
}
```
Note the timeout error is a result of the infinite loop inside the student's program.


## Assessment XML Files

Every assessment is represented as an XML file. They have a single node `PROBLEMS` with many child nodes `PROBLEM`. Within each `PROBLEM` node, you may create any number of `TESTCASES` child nodes. Each child node must be either `PUBLIC` or `PRIVATE`, which dictates if that test case will be exposed to the student.

Within each `PROBLEM` node, you may also create `PREPEND`[[1]](#1) or/and `POSTPEND`[[2]](#2) programs.

For example, the above gradings may be represented like so,

```xml
<PROBLEMS>
    <PROBLEM maxgrade="" maxxp="" type="programming">
        <TEXT>TEXT FOR BRIEFING STUDENTS</TEXT>
        <SNIPPET>
            <PREPEND></PREPEND>
            <TEMPLATE>
                function fib(n) {
                    // Write your function here
                }
            </TEMPLATE>
            <SOLUTION>
                // This content isn't used by the autograder, but it will be displayed for the manual graders to see.
                function fib(n) {
                    if (n <= 1) {
                        return n;
                    } else {
                        return fib(n - 1) + fib(n - 2);
                    }
                }
            </SOLUTION>
            <POSTPEND></POSTPEND>
            <TESTCASES>
                <PUBLIC score="1" answer="1">fib(1);</PUBLIC>
                <PUBLIC score="1" answer="5">fib(5);</PUBLIC>
                <PUBLIC score="1" answer="55">fib(10);</PUBLIC>
                <PRIVATE score="1" answer="0">fib(0);</PRIVATE>
                <PRIVATE score="1" answer="377">fib(14);</PRIVATE>
                <PRIVATE score="1" answer="610">fib(15);</PRIVATE>
            </TESTCASES>
        </SNIPPET>
    </PROBLEM>
</PROBLEMS>
```

The grader will receive a set of strings, consisting of the prepend, student, postpend and an array of test case program strings. The grader will then return a `Summary` JSON.

```json
{
 "totalScore": 6,
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
  },
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




<a name="1"></a>[1] Prepend programs should be created in assessments that require students to make use of abstracted functions / variables that are declared but hidden away.

<a name="2"></a>[2] Postpend programs should be created in assessments that require students to do deep comparison/copies rather than shallow comparisons/copies. (For example, in the missions involving `set_head` and `set_tail`) 

