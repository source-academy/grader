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
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 2, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
  ])
})

test('stream grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
    {'grade': 0, 'resultType': 'pass'},
    {'grade': 0, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
  ])
})

test('stream grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 0, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
  ])
})

test('stream grader OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.invalid.runtime))
  expect(results).toEqual([
    {'grade': 1, 'resultType': 'pass'},
    {'grade': 2, 'resultType': 'pass'},
    {'grade': 1, 'resultType': 'pass'},
    {'errors': [{'errorType': 'runtime', 'line': 3, 'location': 'grader'}], 'resultType': 'error'},
  ])
})
