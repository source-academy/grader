import { awsEventFactory } from './helpers'
import { runAll, Testcase } from '../index'
import { Student, Grader } from './types';

const makeAwsEvent = awsEventFactory({
  chapter: 1,
  external: {
    name: 'NONE',
    symbols: []
  },
  globals: []
})

/*
  Simple fibonacci function test.

  No prepend.

  Student program: correct, partial, wrong, syntax, runtime, timeout.

  No postpend.

  Testcase program: valid, syntax, runtime, timeout.
*/

const validStudentCorrect =
  `const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2);`

const validStudentWrong =
  `const f = i => i < 3 ? 2 : f(i-2) + f(i-3);`

const validStudentPartial =
  `const f = i => i < 3 ? 1 : f(i-1) + f(i-2);`

const invalidStudentRuntime =
  `const f = i => f(j+1);`

const invalidStudentSyntax =
  `const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2)`

// Does not compute fast enough to exceed max call stacks, relies on timeout
const invalidStudentTimeout =
  `const f = i => i < -3 ? 0 : f(i+1) + f(i+2);`

const student: Student = {
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  },
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: invalidStudentSyntax,
    timeout: invalidStudentTimeout
  }
}

const validTestcases: Testcase[] = [
  {
    program: `f(1);`,
    answer: "1",
    score: 1
  },
  {
    program: `f(3);`,
    answer: "2",
    score: 1
  },
  {
    program: `f(5);`,
    answer: "5",
    score: 1
  }
]

const invalidTestcaseSyntax = [
  {
    program: `f(1)`,
    answer: "1",
    score: 1
  }
]

const invalidTestcaseRuntime = [
  {
    program: `g(1);`,
    answer: "1",
    score: 1
  }
]

const grader: Grader = {
  validPrepend: ``,
  validPostpend: ``,
  validTestcases: validTestcases,
  invalidTestcases: {
    runtime: invalidTestcaseRuntime,
    syntax: invalidTestcaseSyntax
  }
}

test('prepend OK, postpend OK, testcases OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
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

test('prepend OK, postpend OK, testcases OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.partial!,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
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

test('prepend OK, postpend OK, testcases OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.wrong,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
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
        "actual": "4"
      },
      {
        "resultType": "fail",
        "expected": "5",
        "actual": "6"
      }
    ]
  })
})

test('prepend OK, postpend OK, testcases OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.runtime,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 0,
    "results": [
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 1,
            "location": "student",
            "errorLine": "const f = i => f(j+1);",
            "errorExplanation": "Name j not declared."
          }
        ]
      },
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 1,
            "location": "student",
            "errorLine": "const f = i => f(j+1);",
            "errorExplanation": "Name j not declared."
          }
        ]
      },
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 1,
            "location": "student",
            "errorLine": "const f = i => f(j+1);",
            "errorExplanation": "Name j not declared."
          }
        ]
      }
    ]
  })
})

test('prepend OK, postpend OK, testcases OK, student syntaxError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.syntax,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
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
  })
})

test('prepend OK, postpend OK, testcases OK, student timeoutError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.timeout!,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
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

test('prepend OK, postpend OK, testcases runtimeError, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.invalidTestcases!.runtime
  }))
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
            "errorLine": "g(1);",
            "errorExplanation": "Name g not declared."
          }
        ]
      }
    ]
  })
})

test('prepend OK, postpend OK, testcases syntaxError, student OK', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.invalidTestcases!.syntax
  }))
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
            "errorLine": "f(1)",
            "errorExplanation": "Missing semicolon at the end of statement"
          }
        ]
      }
    ]
  })
})