import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import { Grader, Student } from './types';

const makeAwsEvent = awsEventFactory({
  chapter: 3,
  external: {
    name: 'NONE',
    symbols: []
  },
  globals: []
})

/*
  Test stream functions

  No prepend.

  Student program: correct, partial, wrong.

  Valid postpend.

  Testcase program: correct.
*/

const validStudentCorrect =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  const odd_stream = stream_filter(is_odd, enum_stream(1, 50));
  `

const validStudentWrong =
  `
  const odd_stream = stream_filter(n => n % 2 === 1, list_to_stream(list(1, 2, 3)));
  `

const validStudentPartial =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  const odd_stream = stream_filter(is_odd, stream_append(enum_stream(1, 3), enum_stream(4, 5)));
  `

const invalidStudentRuntime =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  // Will stack overflow is_stream
  const odd_stream = stream_filter(is_odd, integers_from(1));
  `

export const student: Student = {
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: "a",
  },
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  }
}

const validGrader = [
  {
    program: `
  function stream_testcase_a() {
    const lst = stream_to_list(stream_take_max(odd_stream, 3));
    return equal(lst, list(1, 3, 5));
  }
  stream_testcase_a();
  `,
    answer: "true",
    score: 1
  },
  {
    program: `
  function stream_testcase_b() {
    const lst = stream_to_list(stream_take_max(odd_stream, 5));
    return equal(lst, list(1, 3, 5, 7, 9));
  }
  stream_testcase_b();
  `,
    answer: "true",
    score: 1
  },
  {
    program: `
  function stream_testcase_c() {
    return !is_null(stream_member(3, odd_stream)) &&
      stream_ref(odd_stream, 1) === 3;
  }
  stream_testcase_c();
  `,
    answer: "true",
    score: 1
  },
  /* 
    TODO: Reimplement testcase once is_stream issue is resolved 
    https://github.com/source-academy/js-slang/issues/351
  {
    program: `
  function stream_testcase_d() {
    return is_stream(odd_stream);
  }
  stream_testcase_d();
  `, answer: "true",
    score: 1
  // }
  */
]

export const grader: Grader = {
  validPrepend: "",
  validPostpend: `function stream_take_max(str, n) {
    return is_null(str) || n === 0
      ? null
      : pair(head(str), () => stream_take_max(stream_tail(str), n - 1));
  }`,
  validTestcases: validGrader
}

test('stream grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 3, // 4,
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
      // {
      //   "resultType": "pass",
      //   "score": 1
      // }
    ]
  })
})

test('stream grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.wrong,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 1, // 2,
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
      },
      // {
      //   "resultType": "pass",
      //   "score": 1
      // }
    ]
  })
})

test('stream grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.partial!,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 2, // 3,
    "results": [
      {
        "resultType": "pass",
        "score": 1
      },
      {
        "resultType": "fail",
        "expected": "true",
        "actual": "false"
      },
      {
        "resultType": "pass",
        "score": 1
      },
      // {
      //   "resultType": "pass",
      //   "score": 1
      // }
    ]
  })
})

test('stream grader OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.runtime,
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
      },
      // {
      //   "resultType": "error",
      //   "errors": [
      //     {
      //       "errorType": "runtime",
      //       "line": 3,
      //       "location": "testcase",
      //       "errorLine": "return is_stream(odd_stream, 1);",
      //       "errorExplanation": "RangeError: Maximum call stack size exceeded"
      //     }
      //   ]
      // }
    ]
  })
})
