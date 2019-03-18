import { grader, student } from './examples/chap3'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import 'jest'

const makeAwsEvent = awsEventFactory({
  chapter: 3,
  external: {
    name: 'NONE',
    symbols: []
  },
  globals: []
})

test('prepend OK, postpend OK, testCases OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
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
   })
})

test('prepend OK, postpend OK, testCases OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.partial!,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 1,
    "results": [
     {
      "resultType": "fail",
      "expected": "true",
      "actual": "false"
     },
     {
      "resultType": "fail",
      "expected": "true",
      "actual": "false"
     },
     {
      "resultType": "pass",
      "score": 1
     }
    ]
   })
})

test('prepend OK, postpend OK, testCases OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.wrong,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "fail",
      "expected": "true",
      "actual": "false"
     },
     {
      "resultType": "fail",
      "expected": "true",
      "actual": "false"
     },
     {
      "resultType": "fail",
      "expected": "true",
      "actual": "false"
     }
    ]
   })
})


test('prepend OK, postpend OK, testCases OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.runtime,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 2,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 3,
        "location": "student",
        "errorLine": "y = 'a';",
        "errorExplanation": "Name y not declared"
       }
      ]
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
  })
})

test('prepend OK, postpend OK, testCases OK, student syntaxError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.syntax,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 2,
        "location": "student",
        "errorLine": "function reassign_x() { g }",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 2,
        "location": "student",
        "errorLine": "function reassign_x() { g }",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 2,
        "location": "student",
        "errorLine": "function reassign_x() { g }",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     }
    ]
  })
})

test('prepend OK, postpend OK, testCases OK, student timeoutError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.timeout!,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "timeout"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "timeout"
       }
      ]
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
  })
})

test('prepend OK, postpend OK, testCases runtimeError, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testCases: grader.invalidTestcases!.runtime}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 1,
        "location": "testcase",
        "errorLine": "check();",
        "errorExplanation": "Name check not declared"
       }
      ]
     }
    ]
   })
})

test('prepend OK, postpend OK, testCases syntaxError, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testCases: grader.invalidTestcases!.syntax}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 1,
        "location": "testcase",
        "errorLine": "check_x(x, 1)",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     }
    ]
   })
})

test('prepend runtime, postpend OK, testCases OK, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.invalidPrepend!.runtime,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 3,
        "location": "prepend",
        "errorLine": "let arr = list1();",
        "errorExplanation": "Name list1 not declared"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 3,
        "location": "prepend",
        "errorLine": "let arr = list1();",
        "errorExplanation": "Name list1 not declared"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 3,
        "location": "prepend",
        "errorLine": "let arr = list1();",
        "errorExplanation": "Name list1 not declared"
       }
      ]
     }
    ]
   })
})

test('prepend syntax, postpend OK, testCases OK, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.invalidPrepend!.syntax,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 3,
        "location": "prepend",
        "errorLine": "let arr = []",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 3,
        "location": "prepend",
        "errorLine": "let arr = []",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 3,
        "location": "prepend",
        "errorLine": "let arr = []",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     }
    ]
   })
})

test('prepend OK, postpend runtime, testCases OK, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.invalidPostpend!.runtime,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 1,
        "location": "postpend",
        "errorLine": "a();",
        "errorExplanation": "Name a not declared"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 1,
        "location": "postpend",
        "errorLine": "a();",
        "errorExplanation": "Name a not declared"
       }
      ]
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 1,
        "location": "postpend",
        "errorLine": "a();",
        "errorExplanation": "Name a not declared"
       }
      ]
     }
    ]
   })
})

test('prepend OK, postpend runtime, testCases OK, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.invalidPostpend!.syntax,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "syntax",
        "line": 1,
        "location": "postpend",
        "errorLine": "a()",
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
        "location": "postpend",
        "errorLine": "a()",
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
        "location": "postpend",
        "errorLine": "a()",
        "errorExplanation": "Missing semicolon at the end of statement"
       }
      ]
     }
    ]
   })
})
