import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
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
import { EvaluatorRun, runInEvaluator, WORKER_BOOTSTRAP } from '../conductorHost'
import { AwsEvent } from '../types'

const manifestPath = path.join(__dirname, '..', '..', 'vendor', 'evaluators', 'manifest.json')

const event = (over: Partial<AwsEvent> = {}, evaluator = 'ocamlJsOfOCaml'): AwsEvent => ({
  library: {
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
  results: [],
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
    expect(result).toMatchObject({
      resultType: 'error',
      errors: [{ errorType: 'runtime', errorExplanation: 'Type error' }],
    })
  })

  it('has every error the evaluator reported, as a runtime error', () => {
    expect(gradeRun(run({ errors: ['a', 'b'] }), testcase)).toMatchObject({
      resultType: 'error',
      errors: [
        { errorType: 'runtime', errorExplanation: 'a' },
        { errorType: 'runtime', errorExplanation: 'b' },
      ],
    })
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
      files: {},
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

  it('allows an evaluator the startup time that its manifest entry says, instead of the default', async () => {
    const timeouts: number[] = []
    const grade = (entry: Manifest[string]) =>
      runAll(event(), {
        manifest: { ocamlJsOfOCaml: entry },
        manifestPath: '/v/manifest.json',
        runEvaluator: async (_evaluator, _fileName, _program, timeoutMs) => {
          timeouts.push(timeoutMs)
          return run({ outputs: ['120'] })
        },
      })
    await grade({ script: 'e.js', fileName: '/main.ml' })
    await grade({ script: 'e.js', fileName: '/main.ml', startupAllowanceMs: 15000 })
    // the default allowance is 2 s (EVALUATOR_STARTUP_ALLOWANCE unset)
    expect(timeouts[1] - timeouts[0]).toBe(15000 - 2000)
  })

  it('caps a testcase at what the Lambda has left, less the margin, and times out the rest after it', async () => {
    const limits: number[] = []
    const summary = await runAll(event(), {
      manifest: { ocamlJsOfOCaml: { script: 'e.js', fileName: '/main.ml' } },
      manifestPath: '/v/manifest.json',
      // 4 s left, less the 2 s margin: below TIMEOUT plus the startup allowance (5 s)
      getRemainingTimeInMillis: () => 4000,
      runEvaluator: async (_evaluator, _fileName, _program, timeoutMs) => {
        limits.push(timeoutMs)
        return run({ timedOut: true })
      },
    })
    expect(limits[0]).toBeLessThanOrEqual(2000)
    expect(limits[0]).toBeGreaterThan(1000)
    expect(summary.results.every(r => r.resultType === 'error')).toBe(true)
  })

  it('does not run a testcase after the event deadline', async () => {
    const programs: string[] = []
    const summary = await runAll(event(), {
      manifest: { ocamlJsOfOCaml: { script: 'e.js', fileName: '/main.ml' } },
      manifestPath: '/v/manifest.json',
      getRemainingTimeInMillis: () => 1000, // less than the margin
      runEvaluator: async (_evaluator, _fileName, program) => {
        programs.push(program)
        return run({ outputs: ['120'] })
      },
    })
    expect(programs).toEqual([])
    expect(summary.results.every(r => r.resultType === 'error')).toBe(true)
  })

  it('refuses an evaluator it does not have, and an event that names none', async () => {
    await expect(runAll(event({}, 'nope'), { manifest: {} })).rejects.toThrow(/nope/)
    await expect(
      runAll(event({ library: { language: 'python' } }), { manifest: {} }),
    ).rejects.toThrow(/undefined/)
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

  it('does not give the program the grader’s environment', async () => {
    process.env.GRADER_SECRET_FOR_TEST = 'hunter2'
    try {
      const summary = await runAll(
        event({
          studentProgram: '',
          testcases: [
            { program: ';; Sys.getenv_opt "GRADER_SECRET_FOR_TEST"', answer: 'None', score: 1 },
          ],
        }),
      )
      expect(summary.results).toEqual([{ resultType: 'pass', score: 1 }])
    } finally {
      delete process.env.GRADER_SECRET_FOR_TEST
    }
  })

  it('does not let the program reach the machine: no shell commands, no real files', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'grader-sandbox-'))
    const secret = path.join(dir, 'secret.txt')
    const touched = path.join(dir, 'touched')
    const written = path.join(dir, 'written.txt')
    writeFileSync(secret, 'hunter2')
    try {
      const summary = await runAll(
        event({
          studentProgram: '',
          testcases: [
            { program: `;; Sys.command "touch ${touched}"`, answer: '127', score: 1 },
            {
              program: `;; In_channel.with_open_text "${secret}" In_channel.input_all`,
              answer: '"hunter2"',
              score: 1,
            },
            {
              program: `let () = Out_channel.with_open_text "${written}" (fun oc -> output_string oc "x")\n;; 1`,
              answer: '1',
              score: 1,
            },
          ],
        }),
      )
      expect(summary.results.map(r => r.resultType)).toEqual(['pass', 'error', 'pass'])
      expect(existsSync(touched)).toBe(false)
      expect(existsSync(written)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
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
    const worker = new Worker(WORKER_BOOTSTRAP, { workerData: { script } })
    try {
      const reply = new Promise(resolve => worker.once('message', resolve))
      worker.postMessage('ping')
      expect(await reply).toEqual({ echo: 'ping', selfIsGlobal: true })
    } finally {
      await worker.terminate()
    }
  })

  it('loads an evaluator that is an ES module with top-level await', async () => {
    const script = path.join(__dirname, 'fixtures', 'browser-worker-esm.mjs')
    const worker = new Worker(WORKER_BOOTSTRAP, { workerData: { script } })
    try {
      const reply = new Promise(resolve => worker.once('message', resolve))
      // sent at once, before the module has loaded: the port holds it until the module listens
      worker.postMessage('ping')
      expect(await reply).toEqual({ echo: 'ping', waited: true })
    } finally {
      await worker.terminate()
    }
  })

  it('reports a script that cannot be loaded as an error of the worker', async () => {
    const worker = new Worker(WORKER_BOOTSTRAP, {
      workerData: { script: path.join(__dirname, 'fixtures', 'does-not-exist.js') },
    })
    await expect(new Promise((_, reject) => worker.once('error', reject))).rejects.toThrow()
    await worker.terminate()
  })
})

describe('the host', () => {
  it('waits for everything the evaluator sent, not for its status update alone', async () => {
    const script = path.join(__dirname, 'fixtures', 'chatty-evaluator.mjs')
    const run = await runInEvaluator({ script, env: {} }, '/main.x', 'ignored', 20000)
    expect(run.failure).toBeUndefined()
    // finished because everything had arrived, not because the watchdog went off
    expect(run.timedOut).toBe(false)
    expect(run.outputs).toHaveLength(300)
    expect(run.outputs[299]).toBe('line 299')
    // the evaluator's own result (42), and the void result that BasicEvaluator sends for the file
    expect(run.results).toStrictEqual([42, undefined])
    expect(run.errors).toEqual(['boom'])
  })
})
