import { runAll } from '../conductorGrader'
import { AwsEvent, Library, Testcase } from '../types'

// Source is graded by js-slang's conductor evaluators, vendored in vendor/evaluators (see the manifest);
// an event names the one that grades it. A testcase's answer is the value of the last expression, as
// `formatValue` shows it (the manifest's `answerFrom: result`).

const library = (n: number): Library => ({ language: `source${n}`, evaluator: `source${n}Default` })

function event(overrides: Partial<AwsEvent> = {}): AwsEvent {
  return {
    library: library(3),
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

describe('grading a Source question', () => {
  it('passes, fails, and reports a runtime error', async () => {
    const summary = await runAll(
      event({
        studentProgram: 'function fact(n) { return n === 0 ? 1 : n * fact(n - 1); }',
        testcases: [
          testcase('fact(5);', '120'),
          testcase('fact(5);', '121'),
          testcase('fact(1)(2);', '1'),
        ],
      }),
    )
    expect(summary.maxScore).toBe(3)
    expect(summary.totalScore).toBe(1)
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toEqual({ resultType: 'fail', expected: '121', actual: '120' })
    expect(summary.results[2]).toMatchObject({
      resultType: 'error',
      errors: [{ errorType: 'runtime', errorExplanation: expect.stringContaining('non-function') }],
    })
  }, 60_000)

  it('compares the value of the last expression, not what the program displays', async () => {
    const summary = await runAll(
      event({
        testcases: [testcase('display("debug");\n7;', '7'), testcase('display(7);', 'undefined')],
      }),
    )
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
    expect(summary.results[1]).toMatchObject({ resultType: 'fail' })
  }, 60_000)

  it('shows values as formatValue does: strings quoted, lists as nested pairs, booleans', async () => {
    const summary = await runAll(
      event({
        testcases: [
          testcase('"hello";', '"hello"'),
          testcase('list(1, 2);', '[1, [2, null]]'),
          testcase('1 < 2;', 'true'),
          testcase('pair(1, pair(2, null));', '[1, [2, null]]'),
        ],
      }),
    )
    expect(summary.results.map(r => r.resultType)).toEqual(['pass', 'pass', 'pass', 'pass'])
  }, 60_000)

  it('lets prepend and postpend define what the student’s code and the testcase use', async () => {
    const summary = await runAll(
      event({
        prependProgram: 'const offset = 100;',
        studentProgram: 'function f(x) { return x + offset; }',
        postpendProgram: 'function check(x) { return f(x) * 2; }',
        testcases: [testcase('check(1);', '202')],
      }),
    )
    expect(summary.results[0]).toEqual({ resultType: 'pass', score: 1 })
  }, 60_000)

  it('reports a syntax error, and an infinite loop, as an error of the testcase', async () => {
    const summary = await runAll(
      event({
        studentProgram: 'const = ;',
        testcases: [testcase('1;', '1')],
      }),
    )
    expect(summary.results[0]).toMatchObject({ resultType: 'error' })
    const loop = await runAll(event({ testcases: [testcase('while (true) {}', '')] }))
    expect(loop.results[0]).toMatchObject({ resultType: 'error' })
  }, 60_000)

  it('runs the evaluator that the event names: Source §1 has no loops, §3 has', async () => {
    const run = (n: number) =>
      runAll(
        event({
          library: library(n),
          testcases: [
            testcase('let s = 0;\nfor (let i = 0; i < 3; i = i + 1) { s = s + i; }\ns;', '3'),
          ],
        }),
      )
    expect((await run(1)).results[0].resultType).toBe('error')
    expect((await run(3)).results[0]).toEqual({ resultType: 'pass', score: 1 })
  }, 60_000)
})
