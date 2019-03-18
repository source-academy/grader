import { grader, student } from './examples/streams'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import 'jest'

const makeAwsEvent = awsEventFactory({
  chapter: 3,
  external: {
    name: 'STREAMS',
    symbols: [
      'stream_filter',
      'stream_to_list',
      'stream_take_max',
      'stream_tail',
      'stream_ref',
      'stream_member',
      'is_stream',
      'integers_from',
      'enum_stream',
      'list_to_stream',
      'stream_append',
      'equal',
      'list',
    ]
  },
  globals: []
})

test('stream grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 4,
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
     }
    ]
   })
})

test('stream grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.wrong,
    postpendProgram: grader.validPostpend,
    testCases: grader.validTestcases}))
  expect(results).toEqual({
    "totalScore": 2,
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
     {
      "resultType": "pass",
      "score": 1
     }
    ]
   })
})

test('stream grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.partial!,
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
      "resultType": "fail",
      "expected": "true",
      "actual": "false"
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

test('stream grader OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.invalid.runtime,
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
     },
     {
      "resultType": "error",
      "errors": [
       {
        "errorType": "runtime",
        "line": 3,
        "location": "testcase",
        "errorLine": "return is_stream(odd_stream, 1);",
        "errorExplanation": "RangeError: Maximum call stack size exceeded"
       }
      ]
     }
    ]
   })
})
