import { AwsEvent, Library, Testcase } from '../types'
import {
  assemblePythonProgram,
  gradePythonRun,
  lastPrintedLine,
  type PythonProgramRunner,
  resolveBundlePath,
  runAll,
  workerRunner,
} from '../pythonGrader'

const library: Library = { chapter: 4, external: { name: 'NONE', symbols: [] }, globals: [] }

function event(overrides: Partial<AwsEvent> = {}): AwsEvent {
  return {
    library,
    prependProgram: '',
    studentProgram: '',
    postpendProgram: '',
    testcases: [],
    ...overrides,
  }
}

describe('assemblePythonProgram', () => {
  it('joins prepend, student, __program__ binding, postpend, testcase in order', () => {
    const tc: Testcase = { program: 'print(a + b)', answer: '3', score: 1 }
    expect(assemblePythonProgram(event({ prependProgram: 'a = 1', studentProgram: 'b = 2' }), tc)).toBe(
      'a = 1\nb = 2\n__program__ = "b = 2"\nprint(a + b)',
    )
  })

  it('drops empty parts but always binds __program__ (even for empty student code)', () => {
    const tc: Testcase = { program: 'print(1)', answer: '1', score: 1 }
    expect(assemblePythonProgram(event(), tc)).toBe('__program__ = ""\nprint(1)')
  })
})

describe('lastPrintedLine', () => {
  it('returns the last line, trimmed', () => {
    expect(lastPrintedLine(['3'])).toBe('3')
    expect(lastPrintedLine(['a', 'b', '3'])).toBe('3')
    expect(lastPrintedLine(['  5  '])).toBe('5')
  })

  it('keeps a single multi-line print intact (matches consoleLogs, not a newline split)', () => {
    expect(lastPrintedLine(['a\nb'])).toBe('a\nb')
  })

  it('is the empty string when nothing was printed', () => {
    expect(lastPrintedLine([])).toBe('')
  })
})

describe('gradePythonRun', () => {
  const tc: Testcase = { program: 'print(3)', answer: '3', score: 2 }

  it('passes when the last printed line equals the answer', () => {
    expect(gradePythonRun({ lines: ['debug', '3'], timedOut: false }, tc)).toEqual({
      resultType: 'pass',
      score: 2,
    })
  })

  it('fails and reports expected/actual otherwise', () => {
    expect(gradePythonRun({ lines: ['4'], timedOut: false }, tc)).toEqual({
      resultType: 'fail',
      expected: '3',
      actual: '4',
    })
  })

  it('reports the error kind when the run errored', () => {
    expect(
      gradePythonRun(
        { lines: [], error: { errorType: 'runtime', message: 'ZeroDivisionError: x' }, timedOut: false },
        tc,
      ),
    ).toEqual({
      resultType: 'error',
      errors: [
        {
          errorType: 'runtime',
          line: 0,
          location: 'unknown',
          errorLine: '',
          errorExplanation: 'ZeroDivisionError: x',
        },
      ],
    })
  })

  it('reports a timeout when the run did not settle', () => {
    expect(gradePythonRun({ lines: [], timedOut: true }, tc)).toEqual({
      resultType: 'error',
      errors: [{ errorType: 'timeout' }],
    })
  })
})

describe('runAll (injected runner)', () => {
  // Pretends the evaluator prints the integer inside the testcase's `print(<n>)`.
  const echoingRunner: PythonProgramRunner = program => {
    const match = program.match(/print\((\d+)\)\s*$/)
    return Promise.resolve({ lines: match ? [match[1]] : [], timedOut: false })
  }

  it('grades each testcase and aggregates the score', async () => {
    const testcases: Testcase[] = [
      { program: 'print(1)', answer: '1', score: 2 },
      { program: 'print(9)', answer: '2', score: 3 },
    ]
    const summary = await runAll(event({ testcases }), { createRunner: () => echoingRunner })

    expect(summary.maxScore).toBe(5)
    expect(summary.totalScore).toBe(2)
    expect(summary.results).toEqual([
      { resultType: 'pass', score: 2 },
      { resultType: 'fail', expected: '2', actual: '9' },
    ])
  })

  it('returns a zero-score empty summary when there are no testcases', async () => {
    expect(await runAll(event({ testcases: [] }), { createRunner: () => echoingRunner })).toEqual({
      totalScore: 0,
      maxScore: 0,
      results: [],
    })
  })
})

// End-to-end through the real vendored py2js bundle in a worker.
describe('runAll (vendored py2js engine)', () => {
  it('grades a Python question: pass, fail, and a runtime error', async () => {
    const summary = await runAll(
      event({
        studentProgram: 'def f(x):\n    return x + 1',
        testcases: [
          { program: 'print(f(41))', answer: '42', score: 1 },
          { program: 'print(f(0))', answer: '99', score: 1 },
          { program: 'print(1 // 0)', answer: '0', score: 1 },
        ],
      }),
    )

    expect(summary.maxScore).toBe(3)
    expect(summary.totalScore).toBe(1)
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toEqual({ resultType: 'fail', expected: '99', actual: '1' })
    expect(summary.results[2].resultType).toBe('error')
  })

  it('grades the last printed line when a testcase prints more than once', async () => {
    const summary = await runAll(
      event({
        studentProgram: '',
        testcases: [{ program: 'print("debug")\nprint(6 * 7)', answer: '42', score: 1 }],
      }),
    )
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
  })

  it('terminates a runaway loop and reports a timeout', async () => {
    const run = await workerRunner(resolveBundlePath())('while True:\n    pass', 300)
    expect(run.timedOut).toBe(true)
  })
})
