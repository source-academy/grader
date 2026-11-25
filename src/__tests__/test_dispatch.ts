import type { AwsEvent } from '../types'

const summary = { totalScore: 0, maxScore: 0, results: [] }
jest.mock('../sourceGrader', () => ({ runAll: jest.fn(async () => summary) }))
jest.mock('../conductorGrader', () => ({
  ...jest.requireActual('../conductorGrader'),
  runAll: jest.fn(async () => summary),
}))
jest.mock('../pythonGrader', () => ({ runAll: jest.fn(async () => summary) }))

import { runAll } from '../index'
import { runAll as runConductor } from '../conductorGrader'
import { runAll as runPython } from '../pythonGrader'
import { runAll as runSource } from '../sourceGrader'

const event = (language?: AwsEvent['language']): AwsEvent => ({
  language,
  library: { chapter: 1, external: { name: 'NONE', symbols: [] }, globals: [] },
  prependProgram: '',
  studentProgram: '',
  postpendProgram: '',
  testcases: [],
})

beforeEach(() => jest.clearAllMocks())

describe('runAll dispatch', () => {
  it('routes Python events to the Python grader', async () => {
    await runAll(event('python'))
    expect(runPython).toHaveBeenCalledTimes(1)
    expect(runSource).not.toHaveBeenCalled()
  })

  it('routes JavaScript events to the Source grader', async () => {
    await runAll(event('javascript'))
    expect(runSource).toHaveBeenCalledTimes(1)
    expect(runPython).not.toHaveBeenCalled()
  })

  it('defaults to the Python grader when no language is given', async () => {
    await runAll(event())
    expect(runPython).toHaveBeenCalledTimes(1)
    expect(runSource).not.toHaveBeenCalled()
  })

  it('routes an event that names a vendored evaluator to the conductor grader, whatever its language', async () => {
    const e = event('python')
    e.library.evaluator = 'ocamlJsOfOCaml'
    await runAll(e)
    expect(runConductor).toHaveBeenCalledTimes(1)
    expect(runPython).not.toHaveBeenCalled()
    expect(runSource).not.toHaveBeenCalled()
  })

  it('does not, for an evaluator it has not vendored', async () => {
    const e = event('javascript')
    e.library.evaluator = 'source3Default'
    await runAll(e)
    expect(runConductor).not.toHaveBeenCalled()
    expect(runSource).toHaveBeenCalledTimes(1)
  })
})
