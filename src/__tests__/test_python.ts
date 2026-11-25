import { assembleProgram, runAll } from '../conductorGrader'
import { AwsEvent, Library, Testcase } from '../types'

// Python is graded by py-slang's conductor evaluators, vendored in vendor/evaluators (see the manifest).
// The events here are as the backend sent them before it sent evaluator ids: the chapter names the
// evaluator (legacyEvents.ts).

const library = (chapter: number, evaluator?: string): Library => ({
  chapter,
  external: { name: 'NONE', symbols: [] },
  globals: [],
  evaluator,
})

function event(overrides: Partial<AwsEvent> = {}): AwsEvent {
  return {
    language: 'python',
    library: library(4),
    prependProgram: '',
    studentProgram: '',
    postpendProgram: '',
    testcases: [],
    ...overrides,
  }
}

const testcase = (program: string, answer: string, score = 1): Testcase => ({
  program,
  answer,
  score,
})

describe('the program of a Python testcase', () => {
  const binding = '__program__ = %s'

  it('joins prepend, student, the __program__ binding, postpend and testcase in order', () => {
    const e = event({ prependProgram: 'a = 1', studentProgram: 'b = 2', postpendProgram: 'c = 3' })
    expect(assembleProgram(e, testcase('print(a)', '1'), binding)).toBe(
      'a = 1\nb = 2\n__program__ = "b = 2"\nc = 3\nprint(a)',
    )
  })

  it('drops empty parts but always binds __program__, even for empty student code', () => {
    expect(assembleProgram(event(), testcase('print(1)', '1'), binding)).toBe(
      '__program__ = ""\nprint(1)',
    )
  })

  it('quotes the student source as a JSON string', () => {
    const e = event({ studentProgram: 'print("a\\n")' })
    expect(assembleProgram(e, testcase('', ''), binding)).toContain(
      '__program__ = "print(\\"a\\\\n\\")"',
    )
  })
})

describe('grading a Python question', () => {
  it('passes, fails, and reports a runtime error', async () => {
    const summary = await runAll(
      event({
        studentProgram: 'def f(x):\n    return x + 1',
        testcases: [
          testcase('print(f(41))', '42'),
          testcase('print(f(0))', '99'),
          testcase('print(1 // 0)', '0'),
        ],
      }),
    )
    expect(summary.maxScore).toBe(3)
    expect(summary.totalScore).toBe(1)
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toEqual({ resultType: 'fail', expected: '99', actual: '1' })
    expect(summary.results[2]).toMatchObject({
      resultType: 'error',
      errors: [{ errorType: 'runtime' }],
    })
  }, 60_000)

  it('grades the last printed line when a testcase prints more than once', async () => {
    const summary = await runAll(
      event({ testcases: [testcase('print("debug")\nprint(6 * 7)', '42')] }),
    )
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
  }, 60_000)

  it('returns a zero-score summary when there are no testcases', async () => {
    expect(await runAll(event())).toEqual({ totalScore: 0, maxScore: 0, results: [] })
  })

  it('terminates a runaway loop, reports a timeout, and carries on', async () => {
    const summary = await runAll(
      event({ testcases: [testcase('while True:\n    pass', ''), testcase('print(1)', '1')] }),
    )
    expect(summary.results).toEqual([
      { resultType: 'error', errors: [{ errorType: 'timeout' }] },
      { resultType: 'pass', score: 1 },
    ])
  }, 60_000)

  it('gives a postpend grader the student’s source in __program__', async () => {
    const summary = await runAll(
      event({
        studentProgram: 'x = 1',
        postpendProgram: 'print(__program__)',
        testcases: [testcase('', 'x = 1')],
      }),
    )
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
  }, 60_000)

  it('runs the evaluator of the chapter: Python §1 has no list literals, §4 does', async () => {
    const run = (chapter: number) =>
      runAll(
        event({
          library: library(chapter),
          testcases: [testcase('x = [1, 2]\nprint(x)', '[1, 2]')],
        }),
      )
    expect((await run(1)).results[0].resultType).toBe('error')
    expect((await run(4)).results[0]).toEqual({ resultType: 'pass', score: 1 })
  }, 60_000)

  it('runs the evaluator that the event names', async () => {
    const summary = await runAll(
      event({
        library: library(1, 'python3Py2js'),
        testcases: [testcase('x = [1, 2]\nprint(x)', '[1, 2]')],
      }),
    )
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
  }, 60_000)

  it('refuses an evaluator it has not vendored', async () => {
    await expect(runAll(event({ library: library(4, 'python4Stepper') }))).rejects.toThrow(
      /python4Stepper/,
    )
  })
})

describe('Python §4 Typed', () => {
  const typed = library(5)

  it('grades a typed question: pass, wrong answer, and a type error', async () => {
    const summary = await runAll(
      event({
        library: typed,
        studentProgram: 'def f(x: int) -> int:\n    return x + 1',
        testcases: [
          testcase('print(f(41))', '42'),
          testcase('print(f(0))', '99'),
          testcase('print(f("a"))', '1'),
        ],
      }),
    )
    expect(summary.totalScore).toBe(1)
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toEqual({ resultType: 'fail', expected: '99', actual: '1' })
    expect(summary.results[2]).toMatchObject({
      resultType: 'error',
      errors: [{ errorType: 'runtime' }],
    })
  }, 120_000)

  it('gives a type error in the student program to every testcase', async () => {
    const summary = await runAll(
      event({
        library: typed,
        studentProgram: 'def f(x: int) -> int:\n    return "a"',
        testcases: [testcase('print(f(1))', 'a'), testcase('print(f(2))', 'a')],
      }),
    )
    expect(summary.totalScore).toBe(0)
    expect(summary.results.map(r => r.resultType)).toEqual(['error', 'error'])
    expect(summary.results[0]).toMatchObject({ errors: [{ errorType: 'runtime' }] })
  }, 120_000)
})
