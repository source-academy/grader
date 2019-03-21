import { grader, student } from './examples/curves'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import 'jest'

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: 'CURVES',
    symbols: [
      'make_point',
      'draw_points_on',
      'draw_connected',
      'draw_points_squeezed_to_window',
      'draw_connected_squeezed_to_window',
      'draw_connected_full_view',
      'draw_connected_full_view_proportional',
      'x_of',
      'y_of',
      'unit_line',
      'unit_line_at',
      'unit_circle',
      'connect_rigidly',
      'connect_ends',
      'put_in_standard_position',
      'full_view_proportional',
      'squeeze_full_view',
      'squeeze_rectangular_portion',
      'translate',
      'scale',
      '__check_canvas'
    ]
  },
  globals: []
})

test('curve grader correct', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual(
    {
      "totalScore": 1,
      "results": [
        {
          "resultType": "pass",
          "score": 1
        }
      ]
    }
  )
})

test('wrong answer', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.wrong,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual(
    {
      "totalScore": 0,
      "results": [
        {
          "resultType": "fail",
          "expected": "true",
          "actual": "false"
        }
      ]
    }
  )
})