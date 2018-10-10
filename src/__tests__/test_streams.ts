import { grader, student } from './examples/streams'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 3,
  external: {
    name: 'NONE',
    symbols: [
      'stream_filter',
      'stream_to_list',
      'stream_take_max',
      'stream_tail',
      'integers_from',
      'enum_stream',
      'equal',
      'list',
    ]
  },
  globals: []
})

test('stream grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 2, 'resultType': 'pass'},
  ])
})

test('stream grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
    {'grade': 0, 'resultType': 'pass'},
    {'grade': 0, 'resultType': 'pass'},
  ])
})

test('stream grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 0, 'resultType': 'pass'},
  ])
})

