import { grader, student } from './examples/runes2d'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import 'jest'

const makeAwsEvent = awsEventFactory({
  chapter: 1,
  external: {
    name: 'TWO_DIM_RUNES',
    symbols: [
      'red',
      'pink',
      'purple',
      'indigo',
      'blue',
      'green',
      'yellow',
      'orange',
      'brown',
      'black',
      'white',
      'black_bb',
      'blank_bb',
      'rcross_bb',
      'sail_bb',
      'corner_bb',
      'nova_bb',
      'circle_bb',
      'heart_bb',
      'pentagram_bb',
      'ribbon_bb',
      'quarter_turn_left',
      'quarter_turn_right',
      'scale_independent',
      'scale',
      'translate',
      'rotate',
      'stack_frac',
      'stack',
      'stackn',
      'beside_frac',
      'beside',
      'flip_vert',
      'flip_horiz',
      'make_cross',
      'repeat_pattern',
      'overlay_frac',
      'overlay',
      '__compile',
      '__are_pictures_equal',
    ]
  },
  globals: []
})

test('rune grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
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
}, 10000)

test('rune grader OK, student OK, wrong', async () => {
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
      },
      {
        "resultType": "fail",
        "expected": "true",
        "actual": "false"
      }
    ]
  })
}, 10000)

test('rune grader OK, student OK, partial', async () => {
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
}, 10000)