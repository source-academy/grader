import { grader, student } from './examples/sounds'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'
import 'jest'

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: 'SOUND',
    symbols: [
      'consecutively',
      'get_duration',
      'get_wave',
      'is_sound',
      'letter_name_to_midi_note',
      'make_sourcesound',
      'midi_note_to_frequency',
      'noise',
      'play',
      'sawtooth_sound',
      'silence',
      'simultaneously',
      'sine_sound',
      'sound_to_sourcesound',
      'sourcesound_to_sound',
      'square_sound',
      'triangle_sound',
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
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.correct,
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
      }
    ]
  })
})

test('sound grader OK, student OK, wrong', async () => {
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
        "expected": "3",
        "actual": "0"
      },
      {
        "resultType": "fail",
        "expected": "2",
        "actual": "0"
      }
    ]
  })
})

test('sound grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent({
    prependProgram: grader.validPrepend,
    studentProgram: student.valid.partial!,
    postpendProgram: grader.validPostpend,
    testcases: grader.validTestcases
  }))
  expect(results).toEqual({
    "totalScore": 1,
    "results": [
      {
        "resultType": "pass",
        "score": 1
      },
      {
        "resultType": "fail",
        "expected": "3",
        "actual": "1"
      },
      {
        "resultType": "fail",
        "expected": "2",
        "actual": "1"
      }
    ]
  })
}, 10000)
