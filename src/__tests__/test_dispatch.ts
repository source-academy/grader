import type { AwsEvent } from '../types'

const summary = { totalScore: 0, maxScore: 0, results: [] }
jest.mock('../sourceGrader', () => ({ runAll: jest.fn(async () => summary) }))
jest.mock('../conductorGrader', () => ({
  ...jest.requireActual('../conductorGrader'),
  runAll: jest.fn(async () => summary),
}))

import { runAll as runConductor } from '../conductorGrader'
import { runAll } from '../index'
import { legacyEvaluatorId } from '../legacyEvents'
import { runAll as runSource } from '../sourceGrader'

const event = (language?: AwsEvent['language'], chapter = 1, evaluator?: string): AwsEvent => ({
  language,
  library: { chapter, external: { name: 'NONE', symbols: [] }, globals: [], evaluator },
  prependProgram: '',
  studentProgram: '',
  postpendProgram: '',
  testcases: [],
})

beforeEach(() => jest.clearAllMocks())

describe('runAll dispatch', () => {
  it('routes Python events to the conductor grader', async () => {
    await runAll(event('python'))
    expect(runConductor).toHaveBeenCalledTimes(1)
    expect(runSource).not.toHaveBeenCalled()
  })

  it('routes JavaScript events to the Source grader', async () => {
    await runAll(event('javascript'))
    expect(runSource).toHaveBeenCalledTimes(1)
    expect(runConductor).not.toHaveBeenCalled()
  })

  it('treats an event without a language as Python', async () => {
    await runAll(event())
    expect(runConductor).toHaveBeenCalledTimes(1)
    expect(runSource).not.toHaveBeenCalled()
  })

  it('routes an event that names a vendored evaluator to the conductor grader, whatever its language', async () => {
    await runAll(event('javascript', 1, 'ocamlJsOfOCaml'))
    expect(runConductor).toHaveBeenCalledTimes(1)
    expect(runSource).not.toHaveBeenCalled()
  })

  it('leaves a Source event whose evaluator it has not vendored to the Source grader', async () => {
    await runAll(event('javascript', 3, 'source3Default'))
    expect(runConductor).not.toHaveBeenCalled()
    expect(runSource).toHaveBeenCalledTimes(1)
  })

  it('sends a Python event with an evaluator it has not vendored to the conductor grader, which refuses it', async () => {
    await runAll(event('python', 4, 'python4Stepper'))
    expect(runConductor).toHaveBeenCalledTimes(1)
    expect(runSource).not.toHaveBeenCalled()
  })
})

describe('the evaluator of an event that names none', () => {
  it('is, for Python, the one of its chapter: §1 to §4, and §4 Typed from 5 on', () => {
    expect([1, 2, 3, 4].map(chapter => legacyEvaluatorId(event('python', chapter)))).toEqual([
      'python1Py2js',
      'python2Py2js',
      'python3Py2js',
      'python4Py2js',
    ])
    expect(legacyEvaluatorId(event('python', 5))).toBe('python4TypedPy2js')
    expect(legacyEvaluatorId(event('python', 9))).toBe('python4TypedPy2js')
  })

  it('is Python §4 for an event with no usable chapter', () => {
    expect(legacyEvaluatorId(event('python', 0))).toBe('python4Py2js')
    expect(legacyEvaluatorId(event(undefined, 0))).toBe('python4Py2js')
  })

  it('is none for a Source event, which has its own grader', () => {
    expect(legacyEvaluatorId(event('javascript', 3))).toBeUndefined()
  })
})
