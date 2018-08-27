import { grader, student } from './examples/util'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 1,
  external: {
    name: 'NONE',
    symbols: [
      '__track_function',
      '__reset_function_count',
      '__get_function_count',
      'make_funny',
    ]
  },
  globals: [
    ['__tracking_function', 'global.__track_function("make_funny");'],
  ]
})

test('correct wrapped function', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
      {'grade': 2, 'resultType': 'pass'},
  ])
})

test('did not use function', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
      {'grade': 1, 'resultType': 'pass'},
  ])
})

test('incorrect answer', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'},
  ])
})