import type { AwsEvent } from '../types'

const summary = { totalScore: 0, maxScore: 0, results: [] }
jest.mock('../sourceGrader', () => ({ runAll: jest.fn(async () => summary) }))
jest.mock('../pythonGrader', () => ({ runAll: jest.fn(async () => summary) }))

import { runAll } from '../index'
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

  it('routes Source events to the Source grader', async () => {
    await runAll(event('source'))
    expect(runSource).toHaveBeenCalledTimes(1)
    expect(runPython).not.toHaveBeenCalled()
  })

  it('defaults to the Source grader when no language is given', async () => {
    await runAll(event())
    expect(runSource).toHaveBeenCalledTimes(1)
    expect(runPython).not.toHaveBeenCalled()
  })
})
