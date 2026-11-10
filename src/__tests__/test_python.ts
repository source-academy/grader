import { AwsEvent, Library, Testcase } from '../types'
import {
  assemblePythonProgram,
  isTypedChapter,
  locate,
  pythonVariant,
  type PythonTypeChecker,
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
    expect(
      assemblePythonProgram(event({ prependProgram: 'a = 1', studentProgram: 'b = 2' }), tc),
    ).toBe('a = 1\nb = 2\n__program__ = "b = 2"\nprint(a + b)')
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
        {
          lines: [],
          error: { errorType: 'runtime', message: 'ZeroDivisionError: x' },
          timedOut: false,
        },
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

describe('Python §4 Typed', () => {
  const typedLibrary: Library = { ...library, chapter: 5 }

  it('takes chapters from 5 on as typed, run as Python §4', () => {
    expect([1, 4, 5, 6].map(isTypedChapter)).toEqual([false, false, true, true])
    expect([1, 3, 4, 5, 6].map(pythonVariant)).toEqual([1, 3, 4, 4, 4])
  })

  it('finds the part of the program that a line is in', () => {
    const e = event({
      prependProgram: 'a = 1\nb = 2',
      studentProgram: 'c = 3',
      postpendProgram: '',
    })
    const tc: Testcase = { program: 'print(c)', answer: '3', score: 1 }
    // prepend: lines 1-2, student: line 3, the __program__ binding: line 4, testcase: line 5
    expect(locate(e, tc, 2)).toEqual({ location: 'prepend', line: 2 })
    expect(locate(e, tc, 3)).toEqual({ location: 'student', line: 1 })
    expect(locate(e, tc, 5)).toEqual({ location: 'testcase', line: 1 })
  })

  it('does not run a program with type errors, and reports them', async () => {
    const ran: string[] = []
    const checker: PythonTypeChecker = {
      errors: program =>
        Promise.resolve(program.includes('bad') ? [{ line: 1, message: 'wrong type' }] : []),
      dispose: jest.fn(),
    }
    const summary = await runAll(
      event({
        library: typedLibrary,
        studentProgram: 'x = 1',
        testcases: [
          { program: 'print(1)', answer: '1', score: 1 },
          { program: 'bad', answer: '1', score: 1 },
        ],
      }),
      {
        createChecker: () => Promise.resolve(checker),
        createRunner: () => program => {
          ran.push(program)
          return Promise.resolve({ lines: ['1'], timedOut: false })
        },
      },
    )
    expect(summary.totalScore).toBe(1)
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toMatchObject({
      resultType: 'error',
      errors: [
        {
          errorType: 'syntax',
          line: 1,
          location: 'student',
          errorExplanation: 'Type error: wrong type',
        },
      ],
    })
    expect(ran).toHaveLength(1)
    expect(checker.dispose).toHaveBeenCalledTimes(1)
  })

  it('reports a timeout when the checker does not answer, and does not use it again', async () => {
    const errors = jest.fn(() => new Promise<never>(() => {}))
    const checker: PythonTypeChecker = { errors, dispose: jest.fn() }
    const ran = jest.fn()
    const summary = await runAll(
      event({
        library: typedLibrary,
        testcases: [
          { program: 'print(1)', answer: '1', score: 1 },
          { program: 'print(2)', answer: '2', score: 1 },
        ],
      }),
      {
        createChecker: () => Promise.resolve(checker),
        createRunner: () => ran,
        checkTimeoutMs: 50,
      },
    )
    expect(summary.totalScore).toBe(0)
    expect(summary.results).toEqual([
      { resultType: 'error', errors: [{ errorType: 'timeout' }] },
      { resultType: 'error', errors: [{ errorType: 'timeout' }] },
    ])
    expect(errors).toHaveBeenCalledTimes(1)
    expect(ran).not.toHaveBeenCalled()
    expect(checker.dispose).toHaveBeenCalledTimes(1)
  })

  it('reports a checker that fails, without stopping the event', async () => {
    const checker: PythonTypeChecker = {
      errors: () => Promise.reject(new Error('worker died')),
      dispose: jest.fn(),
    }
    const summary = await runAll(
      event({
        library: typedLibrary,
        testcases: [{ program: 'print(1)', answer: '1', score: 1 }],
      }),
      { createChecker: () => Promise.resolve(checker), createRunner: () => jest.fn() },
    )
    expect(summary.results[0]).toMatchObject({
      resultType: 'error',
      errors: [{ errorType: 'runtime', errorExplanation: 'The type checker failed: worker died' }],
    })
  })

  it('reports a checker that cannot be started, without stopping the event', async () => {
    const summary = await runAll(
      event({
        library: typedLibrary,
        testcases: [{ program: 'print(1)', answer: '1', score: 1 }],
      }),
      {
        createChecker: () => Promise.reject(new Error('no worker')),
        createRunner: () => jest.fn(),
      },
    )
    expect(summary.results[0]).toMatchObject({
      resultType: 'error',
      errors: [{ errorExplanation: 'The type checker failed: no worker' }],
    })
  })

  it('starts no checker for an untyped chapter', async () => {
    const createChecker = jest.fn()
    await runAll(event({ testcases: [{ program: 'print(1)', answer: '1', score: 1 }] }), {
      createChecker,
      createRunner: () => () => Promise.resolve({ lines: ['1'], timedOut: false }),
    })
    expect(createChecker).not.toHaveBeenCalled()
  })

  // End to end: the vendored bundle and checker.
  it('grades a typed question: pass, wrong answer, and a type error', async () => {
    const summary = await runAll(
      event({
        library: typedLibrary,
        studentProgram: 'def f(x: int) -> int:\n    return x + 1',
        testcases: [
          { program: 'print(f(41))', answer: '42', score: 1 },
          { program: 'print(f(0))', answer: '99', score: 1 },
          { program: 'print(f("a"))', answer: '1', score: 1 },
        ],
      }),
    )
    expect(summary.totalScore).toBe(1)
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toEqual({ resultType: 'fail', expected: '99', actual: '1' })
    expect(summary.results[2]).toMatchObject({
      resultType: 'error',
      errors: [{ errorType: 'syntax', location: 'testcase', line: 1 }],
    })
  }, 60_000)

  it('gives a type error in the student program to every testcase', async () => {
    const summary = await runAll(
      event({
        library: typedLibrary,
        studentProgram: 'def f(x: int) -> int:\n    return "a"',
        testcases: [{ program: 'print(f(1))', answer: 'a', score: 1 }],
      }),
    )
    expect(summary.totalScore).toBe(0)
    expect(summary.results[0]).toMatchObject({
      resultType: 'error',
      errors: [{ location: 'student', line: 2 }],
    })
  }, 60_000)
})
