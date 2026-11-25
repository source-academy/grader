import { existsSync } from 'fs'
import * as path from 'path'
import { Worker } from 'worker_threads'

import {
  assembleProgram,
  evaluatorOf,
  gradeRun,
  lastOutput,
  Manifest,
  processOf,
  readManifest,
  runAll,
} from '../conductorGrader'
import { EvaluatorRun, WORKER_SOURCE } from '../conductorHost'
import { AwsEvent } from '../types'

const manifestPath = path.join(__dirname, '..', '..', 'vendor', 'evaluators', 'manifest.json')

const event = (over: Partial<AwsEvent> = {}, evaluator = 'ocamlJsOfOCaml'): AwsEvent => ({
  library: {
    chapter: 1,
    external: { name: 'NONE', symbols: [] },
    globals: [],
    language: 'ocaml',
    evaluator,
  },
  prependProgram: '',
  studentProgram: 'let rec fact n = if n = 0 then 1 else n * fact (n - 1)',
  postpendProgram: '',
  testcases: [{ program: ';; fact 5', answer: '120', score: 2 }],
  ...over,
})

const run = (over: Partial<EvaluatorRun> = {}): EvaluatorRun => ({
  outputs: [],
  errors: [],
  timedOut: false,
  ...over,
})

describe('the program of a testcase', () => {
  it('joins prepend, student, postpend and testcase by newlines, leaving out empty parts', () => {
    const e = event({ prependProgram: 'let a = 1', postpendProgram: '  ' })
    expect(assembleProgram(e, e.testcases[0])).toBe(
      'let a = 1\nlet rec fact n = if n = 0 then 1 else n * fact (n - 1)\n;; fact 5',
    )
  })

  it('has as its result the last line that is printed, trimmed', () => {
    expect(lastOutput(['a', ' 120 '])).toBe('120')
    expect(lastOutput([])).toBe('')
  })
})

describe('the result of a testcase', () => {
  const testcase = { program: '', answer: '120', score: 2 }

  it('passes when the last output is the answer', () => {
    expect(gradeRun(run({ outputs: ['x', '120'] }), testcase)).toEqual({
      resultType: 'pass',
      score: 2,
    })
  })

  it('fails with what was expected and what was printed', () => {
    expect(gradeRun(run({ outputs: ['119'] }), testcase)).toEqual({
      resultType: 'fail',
      expected: '120',
      actual: '119',
    })
  })

  it('is an error with the evaluator’s message when it reports one', () => {
    const result = gradeRun(run({ errors: ['Type error'], outputs: ['120'] }), testcase)
    expect(result).toMatchObject({ resultType: 'error' })
    expect(JSON.stringify(result)).toContain('Type error')
  })

  it('is a timeout when the program ran out of time', () => {
    expect(gradeRun(run({ timedOut: true }), testcase)).toEqual({
      resultType: 'error',
      errors: [{ errorType: 'timeout' }],
    })
  })

  it('is an error when the evaluator itself failed', () => {
    expect(JSON.stringify(gradeRun(run({ failure: 'no script' }), testcase))).toContain('no script')
  })
})

describe('the evaluators the grader has', () => {
  const manifest: Manifest = {
    known: { script: 'k.js', fileName: '/main.x', fileEnv: { FILE: 'f.bin' } },
  }

  it('are looked up by the id that the event names, and by nothing else', () => {
    expect(evaluatorOf(event({}, 'known'), manifest)).toBe(manifest.known)
    expect(evaluatorOf(event({}, 'unknown'), manifest)).toBeUndefined()
    expect(evaluatorOf(event({}, 'toString'), manifest)).toBeUndefined()
    expect(
      evaluatorOf(event({ library: { ...event().library, evaluator: undefined } }), manifest),
    ).toBeUndefined()
  })

  it('start from absolute paths, relative to the manifest', () => {
    expect(processOf(manifest.known, '/v/m.json')).toEqual({
      script: '/v/k.js',
      env: { FILE: '/v/f.bin' },
    })
  })

  it('include the OCaml evaluator', () => {
    expect(Object.keys(readManifest(manifestPath))).toContain('ocamlJsOfOCaml')
  })
})

describe('grading an event', () => {
  it('runs each testcase in its own program and sums the scores', async () => {
    const programs: string[] = []
    const summary = await runAll(
      event({
        testcases: [
          { program: ';; fact 5', answer: '120', score: 2 },
          { program: ';; fact 3', answer: '7', score: 3 },
        ],
      }),
      {
        manifest: { ocamlJsOfOCaml: { script: 'e.js', fileName: '/main.ml' } },
        manifestPath: '/v/manifest.json',
        runEvaluator: async (evaluator, fileName, program) => {
          programs.push(program)
          expect(evaluator.script).toBe('/v/e.js')
          expect(fileName).toBe('/main.ml')
          return run({ outputs: [program.endsWith('5') ? '120' : '6'] })
        },
      },
    )
    expect(programs).toHaveLength(2)
    expect(summary.totalScore).toBe(2)
    expect(summary.maxScore).toBe(5)
    expect(summary.results.map(r => r.resultType)).toEqual(['pass', 'fail'])
  })

  it('refuses an evaluator it does not have', async () => {
    await expect(runAll(event({}, 'nope'), { manifest: {} })).rejects.toThrow(/nope/)
  })
})

// The vendored OCaml evaluator, under the real host: a worker thread per testcase.
const ocamlBundle = path.join(
  __dirname,
  '..',
  '..',
  'vendor',
  'evaluators',
  'ocaml',
  'ocaml-toplevel.js',
)
const describeOcaml = existsSync(ocamlBundle) ? describe : describe.skip

describeOcaml('the vendored OCaml evaluator', () => {
  jest.setTimeout(120000)

  it('grades passing, failing and erroring testcases', async () => {
    const summary = await runAll(
      event({
        testcases: [
          { program: ';; fact 5', answer: '120', score: 1 },
          { program: ';; fact 5', answer: '121', score: 1 },
          { program: ';; fact "five"', answer: '120', score: 1 },
          { program: ';; List.hd []', answer: '1', score: 1 },
        ],
      }),
    )
    expect(summary.totalScore).toBe(1)
    expect(summary.results.map(r => r.resultType)).toEqual(['pass', 'fail', 'error', 'error'])
  })

  it('sees what prepend and postpend define, and prints before the testcase’s result', async () => {
    const summary = await runAll(
      event({
        prependProgram: 'let offset = 100',
        studentProgram: 'let f x = x + offset',
        postpendProgram: 'let check x = f x * 2',
        testcases: [{ program: ';; check 1', answer: '202', score: 1 }],
      }),
    )
    expect(summary.results).toEqual([{ resultType: 'pass', score: 1 }])
  })

  it('stops a runaway loop and carries on with the next testcase', async () => {
    const summary = await runAll(
      event({
        studentProgram: 'let rec loop () = loop ()',
        testcases: [
          { program: ';; loop ()', answer: '()', score: 1 },
          { program: ';; 1 + 1', answer: '2', score: 1 },
        ],
      }),
    )
    expect(summary.results).toEqual([
      { resultType: 'error', errors: [{ errorType: 'timeout' }] },
      { resultType: 'pass', score: 1 },
    ])
  })
})

describe('the worker of the host', () => {
  it('gives a script built for a browser worker its globals: self, postMessage, addEventListener', async () => {
    const script = path.join(__dirname, 'fixtures', 'browser-worker.js')
    const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { script } })
    try {
      const reply = new Promise(resolve => worker.once('message', resolve))
      worker.postMessage('ping')
      expect(await reply).toEqual({ echo: 'ping', selfIsGlobal: true })
    } finally {
      await worker.terminate()
    }
  })
})
