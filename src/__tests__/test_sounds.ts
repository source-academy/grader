import { grader, student } from './examples/sounds'
import { awsEventFactory } from './helpers'
import { runAll, TIMEOUT_DURATION } from '..'

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: 'SOUND',
    symbols: [
      'get_duration',
      'get_wave',
      'is_sound',
      'make_sourcesound',
      'play',
      'sound_to_sourcesound',
      'sourcesound_to_sound',
      '__track_function',
      '__reset_function_count',
      '__get_function_count'
    ]
  },
  globals: [
    ['__tracking_function', 'global.__track_function("get_duration");'],
    ['__tracking_function', 'global.__track_function("get_wave");'],
    ['__tracking_function', 'global.__track_function("play");'],
    ['__tracking_function', 'global.__track_function("sourcesound_to_sound");'],
    ['__tracking_function', 'global.__track_function("sound_to_sourcesound");'],
  ]
})

test('sound grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
      {'grade': 1, 'resultType': 'pass'},
      {'grade': 3, 'resultType': 'pass'},
      {'grade': 2, 'resultType': 'pass'}
  ])
}, TIMEOUT_DURATION)

test('sound grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'}
  ])
}, TIMEOUT_DURATION)

test('sound grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
      {'grade': 1, 'resultType': 'pass'},
      {'grade': 1, 'resultType': 'pass'},
      {'grade': 1, 'resultType': 'pass'}
  ])
}, TIMEOUT_DURATION)
