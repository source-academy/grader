import {
  assembleProgram,
  type ConductorProgramRunner,
  gradeRun,
  normalizeOutput,
  runAllConductor,
} from '../conductor'
import { AwsEvent, ConductorLibrary, Testcase } from '../index'

const conductorLibrary: ConductorLibrary = {
  format: 'conductor',
  language: 'python3',
  evaluator: 'python3Default',
}

function event(overrides: Partial<AwsEvent> = {}): AwsEvent {
  return {
    library: conductorLibrary,
    prependProgram: '',
    studentProgram: '',
    postpendProgram: '',
    testcases: [],
    ...overrides,
  }
}

describe('assembleProgram', () => {
  it('concatenates non-empty parts in order with newlines', () => {
    const tc: Testcase = { program: 'C', answer: '', score: 1 }
    expect(assembleProgram(event({ prependProgram: 'A', studentProgram: 'B' }), tc)).toBe('A\nB\nC')
  })

  it('drops empty prepend/postpend segments', () => {
    const tc: Testcase = { program: 'print(x)', answer: '1', score: 1 }
    expect(assembleProgram(event({ studentProgram: 'x = 1' }), tc)).toBe('x = 1\nprint(x)')
  })
})

describe('normalizeOutput', () => {
  it('strips trailing whitespace so a print newline still matches', () => {
    expect(normalizeOutput('3\n')).toBe('3')
    expect(normalizeOutput('hello \n\n')).toBe('hello')
    expect(normalizeOutput('line1\nline2\n')).toBe('line1\nline2')
  })
})

describe('gradeRun', () => {
  const tc: Testcase = { program: 'print(3)', answer: '3', score: 2 }

  it('passes when trimmed stdout matches the answer', () => {
    expect(gradeRun({ output: '3\n', timedOut: false }, tc)).toEqual({
      resultType: 'pass',
      score: 2,
    })
  })

  it('fails and reports expected/actual when stdout differs', () => {
    expect(gradeRun({ output: '4\n', timedOut: false }, tc)).toEqual({
      resultType: 'fail',
      expected: '3',
      actual: '4',
    })
  })

  it('reports a runtime error when the run errored', () => {
    expect(gradeRun({ output: '', error: 'NameError', timedOut: false }, tc)).toEqual({
      resultType: 'error',
      errors: [
        {
          errorType: 'runtime',
          line: 0,
          location: 'testcase',
          errorLine: '',
          errorExplanation: 'NameError',
        },
      ],
    })
  })

  it('reports a timeout when the run did not settle', () => {
    expect(gradeRun({ output: '', timedOut: true }, tc)).toEqual({
      resultType: 'error',
      errors: [{ errorType: 'timeout' }],
    })
  })

  it('falls back to the result channel when there is no stdout', () => {
    expect(
      gradeRun(
        { output: '', result: 42, timedOut: false },
        { program: '', answer: '42', score: 1 },
      ),
    ).toEqual({ resultType: 'pass', score: 1 })
  })
})

describe('runAllConductor', () => {
  // Fake runner: pretends the evaluator prints the integer inside `print(<n>)`.
  const echoingRunner: ConductorProgramRunner = program => {
    const match = program.match(/print\((\d+)\)/)
    return Promise.resolve({ output: `${match ? match[1] : ''}\n`, timedOut: false })
  }

  it('grades each testcase and aggregates the score', async () => {
    const testcases: Testcase[] = [
      { program: 'print(1)', answer: '1', score: 2 },
      { program: 'print(9)', answer: '2', score: 3 },
    ]

    const summary = await runAllConductor(event({ testcases }), {
      createRunner: async () => echoingRunner,
    })

    expect(summary.maxScore).toBe(5)
    expect(summary.totalScore).toBe(2)
    expect(summary.results).toEqual([
      { resultType: 'pass', score: 2 },
      { resultType: 'fail', expected: '2', actual: '9' },
    ])
  })

  it('returns a zero-score empty summary when there are no testcases', async () => {
    const summary = await runAllConductor(event({ testcases: [] }), {
      createRunner: async () => echoingRunner,
    })
    expect(summary).toEqual({ totalScore: 0, maxScore: 0, results: [] })
  })
})
