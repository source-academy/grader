import { grader, student } from './examples/curves'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

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
  const results = await runAll(makeAwsEvent(grader.pixel, student.valid.correct))
  expect(results).toEqual([
      {'grade': 1, 'resultType': 'pass'}
  ])
})

test('wrong answer', async () => {
  const results = await runAll(makeAwsEvent(grader.pixel, student.valid.wrong))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'}
  ])
})

test('scan grader correct', async () => {
  const results = await runAll(makeAwsEvent(grader.scan, student.valid.correct))
  expect(results).toEqual([
      {'grade': 1, 'resultType': 'pass'}
  ])
})

test('scan grader wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.scan, student.valid.wrong))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'}
  ])
})

