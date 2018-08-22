import { grader, student } from './examples/runes2d'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

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
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
      {'grade': 2, 'resultType': 'pass'},
      {'grade': 2, 'resultType': 'pass'},
      {'grade': 2, 'resultType': 'pass'},
      {'grade': 2, 'resultType': 'pass'},
  ])
})

test('rune grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'},
  ])
})

test('rune grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
      {'grade': 2, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 2, 'resultType': 'pass'},
      {'grade': 2, 'resultType': 'pass'},
  ])
})