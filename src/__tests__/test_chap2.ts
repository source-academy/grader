import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import { Grader, Student } from './types';

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: 'NONE',
    symbols: []
  },
  globals: []
})

/*
    List tests

    Prepend program: correct, runtime, syntax.

    Student: correct, wrong, partial.

    Postpend program: correct, runtime, syntax.

    Testcase program: correct.
*/

const validPrependCorrect =
  `
const ist = list(1, 2, 3);
`

const invalidPrependRuntime =
  `
const ist = ist;
`

const invalidPrependSyntax =
  `
const ist = list(1, 2, 3)
`

const validPostpendCorrect =
  `
const __checkEquality = (l1, l2) => equal(l1, l2);
`

const invalidPostpendRuntime =
  `
const __checkEquality = __checkEquality;
`

const invalidPostpendSyntax =
  `
const __checkEquality = (l1, l2) => equal(l1, l2)
`

const validStudentCorrect =
  `
function my_map(xs, f) {
  if (is_null(xs)) {
    return null;
  } else {
    return pair(f(head(xs)), my_map(tail(xs), f));
  }
}
`

const validStudentWrong =
  `
function my_map(xs, f) {
  return pair(xs, xs);
}
`

const invalidStudentRuntime =
  `
function my_map(xs, f) {
  return pair(xs, my_map(tail(xs), f));
}
`

export const student: Student = {
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: "a",
  },
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong
  }
}

const validGrader = [
  {
    program:
      `
my_map(ist, x => x + 1);
`,
    answer: "[2, [3, [4, null]]]",
    score: 1
  },
  {
    program: `
const ist2 = my_map(ist, x => x);

__checkEquality(ist, ist2);
  `,
    answer: "true",
    score: 1
  }
]

export const grader: Grader = {
  validPrepend: validPrependCorrect,
  validPostpend: validPostpendCorrect,
  validTestcases: validGrader,
  invalidPrepend: {
    syntax: invalidPrependSyntax,
    runtime: invalidPrependRuntime
  },
  invalidPostpend: {
    syntax: invalidPostpendSyntax,
    runtime: invalidPostpendRuntime
  }
}

test('chap2 grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 2,
    "maxScore": 2,
    "results": [
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

test('chap2 grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.wrong,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 0,
    "maxScore": 2,
    "results": [
      {
        "resultType": "fail",
        "expected": "[2, [3, [4, null]]]",
        "actual": "[[1, [2, [3, null]]], [1, [2, [3, null]]]]"
      },
      {
        "resultType": "fail",
        "expected": "true",
        "actual": "false"
      }
    ]
  })
})

test('chap2 grader OK, student OK, prepend runtime', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.invalidPrepend!.runtime,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 0,
    "maxScore": 2,
    "results": [
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 2,
            "location": "prepend",
            "errorExplanation": "ReferenceError: Cannot access 'ist' before initialization",
            "errorLine": "const ist = ist;",
          }
        ]
      },
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 2,
            "location": "prepend",
            "errorExplanation": "ReferenceError: Cannot access 'ist' before initialization",
            "errorLine": "const ist = ist;",
          }
        ]
      }
    ]
  })
})

test('chap2 grader OK, student OK, prepend syntax', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.invalidPrepend!.syntax,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 0,
    "maxScore": 2,
    "results": [
      {
        "resultType": "error",
        "errors": [
          {
            "errorExplanation": "Missing semicolon at the end of statement",
            "errorLine": "const ist = list(1, 2, 3)",
            "errorType": "syntax",
            "line": 2,
            "location": "prepend",
          }
        ]
      },
      {
        "resultType": "error",
        "errors": [
          {
            "errorExplanation": "Missing semicolon at the end of statement",
            "errorLine": "const ist = list(1, 2, 3)",
            "errorType": "syntax",
            "line": 2,
            "location": "prepend",
          }
        ]
      }
    ]
  })
})
test('chap2 grader OK, student OK, postpend runtime', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.invalidPostpend!.runtime,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 0,
    "maxScore": 2,
    "results": [
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 2,
            "location": "postpend",
            "errorExplanation": "ReferenceError: Cannot access '__checkEquality' before initialization",
            "errorLine": "const __checkEquality = __checkEquality;",
          }
        ]
      },
      {
        "resultType": "error",
        "errors": [
          {
            "errorType": "runtime",
            "line": 2,
            "location": "postpend",
            "errorExplanation": "ReferenceError: Cannot access '__checkEquality' before initialization",
            "errorLine": "const __checkEquality = __checkEquality;",
          }
        ]
      }
    ]
  })
})
test('chap2 grader OK, student OK, postpend syntax', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.invalidPostpend!.syntax,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 0,
    "maxScore": 2,
    "results": [
      {
        "resultType": "error",
        "errors": [
          {
            "errorExplanation": "Missing semicolon at the end of statement",
            "errorLine": "const __checkEquality = (l1, l2) => equal(l1, l2)",
            "errorType": "syntax",
            "line": 2,
            "location": "postpend",
          }
        ]
      },
      {
        "resultType": "error",
        "errors": [
          {
            "errorExplanation": "Missing semicolon at the end of statement",
            "errorLine": "const __checkEquality = (l1, l2) => equal(l1, l2)",
            "errorType": "syntax",
            "line": 2,
            "location": "postpend",
          }
        ]
      }
    ]
  })
})
