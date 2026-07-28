import { createHash } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'

import type { AwsEvent, ConductorLibrary, Output, Summary, Testcase } from './index'

/**
 * Grades "conductor" programming questions. Unlike the legacy js-slang path,
 * conductor questions carry a `(language, evaluator)` pair that is resolved via
 * `@sourceacademy/language-directory` to an evaluator bundle (a browser Web
 * Worker script published to GitHub Pages). We run that bundle headless in a
 * Node `worker_threads` worker and drive it with the conductor host protocol
 * (`@sourceacademy/conductor`).
 *
 * Scope: only pure-TypeScript evaluators (e.g. python-3 `cse`/PVML) are
 * supported. Pyodide/WASM evaluators require a browser runtime and will surface
 * as a run error here.
 */

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : 3000

// The bundle requests its entry file back from the host; the name is only a
// label (the host returns the assembled program regardless).
const CONDUCTOR_ENTRYPOINT = '/program'

// RunnerStatus values from @sourceacademy/conductor (terminal states).
const RUNNER_STATUS_STOPPED = 5
const RUNNER_STATUS_ERROR = 6

/**
 * The result of running one assembled program through a conductor evaluator.
 * `output` is the accumulated stdout (python-3 CSE surfaces values via stdout,
 * not the result channel); `result` is the final-value channel when an
 * evaluator uses it.
 */
export type ConductorRunResult = {
  output: string
  result?: unknown
  error?: string
  timedOut: boolean
}

/** Runs a single assembled program and reports what it produced. */
export type ConductorProgramRunner = (
  program: string,
  timeoutMs: number,
) => Promise<ConductorRunResult>

export type ConductorDeps = {
  // Injectable for testing: given the conductor library, return a runner. The
  // default resolves + fetches the evaluator bundle and runs it in a worker.
  createRunner?: (library: ConductorLibrary) => Promise<ConductorProgramRunner>
}

// ESM interop: @sourceacademy/conductor and language-directory are ESM-only,
// but this project compiles to CommonJS. A dynamic `import()` written normally
// would be down-levelled by tsc to `require()` (which cannot load ESM), so it
// is smuggled through the Function constructor to keep a native import at
// runtime.
const dynamicImport = new Function('specifier', 'return import(specifier)') as <T = unknown>(
  specifier: string,
) => Promise<T>

type ConductorModules = {
  Conduit: new (
    link: unknown,
    parent?: boolean,
  ) => {
    registerPlugin: (
      pluginClass: unknown,
      ...args: unknown[]
    ) => { startEvaluator: (entry: string) => void }
    terminate: () => void
  }
  BasicHostPlugin: new (conduit: unknown, channels: unknown) => unknown
}

let conductorModulesPromise: Promise<ConductorModules> | undefined

function loadConductorModules(): Promise<ConductorModules> {
  if (!conductorModulesPromise) {
    conductorModulesPromise = Promise.all([
      dynamicImport<{ Conduit: ConductorModules['Conduit'] }>('@sourceacademy/conductor/conduit'),
      dynamicImport<{ BasicHostPlugin: ConductorModules['BasicHostPlugin'] }>(
        '@sourceacademy/conductor/host',
      ),
    ]).then(([conduit, host]) => ({
      Conduit: conduit.Conduit,
      BasicHostPlugin: host.BasicHostPlugin,
    }))
  }
  return conductorModulesPromise
}

/**
 * Resolves a `(language, evaluator)` pair to the evaluator bundle URL using the
 * bundled Source Academy language directory.
 */
async function resolveEvaluatorPath(language: string, evaluator: string): Promise<string> {
  const directory = await dynamicImport<{
    languageMap: Map<string, unknown>
    getLanguageDefinition: (map: Map<string, unknown>, id: string) => unknown
    getEvaluatorDefinition: (lang: unknown, id: string) => { path: string } | undefined
  }>('@sourceacademy/language-directory')

  const languageDefinition = directory.getLanguageDefinition(directory.languageMap, language)
  if (!languageDefinition) {
    throw new Error(`Unknown conductor language: "${language}"`)
  }

  const evaluatorDefinition = directory.getEvaluatorDefinition(languageDefinition, evaluator)
  if (!evaluatorDefinition) {
    throw new Error(`Unknown evaluator "${evaluator}" for conductor language "${language}"`)
  }

  return evaluatorDefinition.path
}

/** Fetches the evaluator bundle to a local cache file (reused across warm invocations). */
async function fetchEvaluatorBundle(url: string): Promise<string> {
  const cacheDir = process.env.CONDUCTOR_CACHE_DIR || tmpdir()
  const digest = createHash('sha256').update(url).digest('hex').slice(0, 32)
  const filePath = join(cacheDir, `conductor-evaluator-${digest}.js`)

  if (existsSync(filePath)) {
    return filePath
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch evaluator bundle (HTTP ${response.status}) from ${url}`)
  }
  writeFileSync(filePath, await response.text(), 'utf8')
  return filePath
}

// Bootstrap executed inside the worker: the evaluator bundle is a browser Web
// Worker IIFE that expects `self` to be the worker global (a MessagePort). Node's
// parentPort is a Web-compatible MessagePort, so exposing it as `self` lets the
// bundle initialise its conductor runner against it.
const WORKER_BOOTSTRAP = `
  const { parentPort, workerData } = require('worker_threads')
  globalThis.self = parentPort
  globalThis.window = globalThis
  if (typeof parentPort.start === 'function') parentPort.start()
  require(workerData.bundlePath)
`

/**
 * Runs one assembled program through the evaluator bundle in a fresh worker,
 * capturing stdout/result/errors. The worker is always terminated afterwards so
 * runaway student code cannot outlive a single testcase.
 */
async function runConductorProgram(
  bundlePath: string,
  program: string,
  timeoutMs: number,
): Promise<ConductorRunResult> {
  const { Conduit, BasicHostPlugin } = await loadConductorModules()

  const outputs: string[] = []
  let capturedResult: unknown
  let capturedError: string | undefined
  let workerError: string | undefined
  let done = false

  let markFinished!: () => void
  const finished = new Promise<void>(resolve => {
    markFinished = resolve
  })
  const settle = () => {
    done = true
    markFinished()
  }

  // BasicHostPlugin is loaded at runtime (ESM), so the host plugin subclass is
  // defined here rather than at module scope.
  const HostBase = BasicHostPlugin as new (
    conduit: unknown,
    channels: unknown,
  ) => Record<string, unknown>
  class NodeHostPlugin extends HostBase {
    private readonly program: string

    constructor(conduit: unknown, channels: unknown, program: string) {
      super(conduit, channels)
      this.program = program
    }

    requestFile(): Promise<string> {
      return Promise.resolve(this.program)
    }
    requestLoadPlugin(): void {}
    queryPluginResolutions(pluginId: string): Record<string, string> {
      return { [pluginId]: pluginId }
    }
    receiveOutput(message: string): void {
      outputs.push(message)
    }
    receiveResult(result: unknown): void {
      if (result !== undefined) {
        capturedResult = result
      }
    }
    receiveError(error: unknown): void {
      capturedError = extractErrorMessage(error)
    }
    receiveStatusUpdate(status: number): void {
      if (status === RUNNER_STATUS_STOPPED || status === RUNNER_STATUS_ERROR) {
        settle()
      }
    }
  }

  const worker = new Worker(WORKER_BOOTSTRAP, { eval: true, workerData: { bundlePath } })
  worker.on('error', error => {
    workerError = extractErrorMessage(error)
    settle()
  })

  // Adapt Node's Worker (EventEmitter) to the conductor's Worker-shaped ILink.
  const link = {
    postMessage: (message: unknown, transfer?: unknown[]) =>
      worker.postMessage(message, transfer as readonly [] | undefined),
    addEventListener: (type: string, listener: (event: { data: unknown }) => void) =>
      worker.on(type, (data: unknown) => listener({ data })),
    terminate: () => {
      void worker.terminate()
    },
  }

  const conduit = new Conduit(link, true)
  const host = conduit.registerPlugin(NodeHostPlugin, program)
  host.startEvaluator(CONDUCTOR_ENTRYPOINT)

  let timer: NodeJS.Timeout
  const watchdog = new Promise<void>(resolve => {
    timer = setTimeout(resolve, timeoutMs)
  })
  await Promise.race([finished, watchdog])
  clearTimeout(timer!)

  try {
    conduit.terminate()
  } catch {
    // best-effort teardown
  }
  await worker.terminate()

  return {
    output: outputs.join(''),
    result: capturedResult,
    error: workerError ?? capturedError,
    timedOut: !done,
  }
}

async function defaultCreateRunner(library: ConductorLibrary): Promise<ConductorProgramRunner> {
  const bundleUrl = await resolveEvaluatorPath(library.language, library.evaluator)
  const bundlePath = await fetchEvaluatorBundle(bundleUrl)
  return (program, timeoutMs) => runConductorProgram(bundlePath, program, timeoutMs)
}

/**
 * Concatenates prepend + student + postpend + testcase into a single program.
 * Conductor evaluators run one entry "file"; for the supported top-level
 * languages the concatenation shares scope exactly like the legacy grader's
 * shared context.
 */
export function assembleProgram(event: AwsEvent, testcase: Testcase): string {
  return [event.prependProgram, event.studentProgram, event.postpendProgram, testcase.program]
    .filter(part => typeof part === 'string' && part.length > 0)
    .join('\n')
}

/** Trailing whitespace is dropped so a `print`-terminated newline still matches. */
export function normalizeOutput(raw: string): string {
  return raw.replace(/\s+$/u, '')
}

/** Turns a raw run into a graded {@link Output}. */
export function gradeRun(run: ConductorRunResult, testcase: Testcase): Output {
  if (run.error !== undefined) {
    return {
      resultType: 'error',
      errors: [
        {
          errorType: 'runtime',
          line: 0,
          location: 'testcase',
          errorLine: '',
          errorExplanation: run.error,
        },
      ],
    }
  }

  if (run.timedOut) {
    return { resultType: 'error', errors: [{ errorType: 'timeout' }] }
  }

  const actualRaw =
    run.output.length > 0 ? run.output : run.result === undefined ? '' : String(run.result)
  const actual = normalizeOutput(actualRaw)
  const expected = normalizeOutput(testcase.answer)

  return actual === expected
    ? { resultType: 'pass', score: testcase.score }
    : { resultType: 'fail', expected: testcase.answer, actual }
}

/**
 * Grades all testcases of a conductor programming question, returning the same
 * {@link Summary} shape the backend expects for legacy questions.
 */
export const runAllConductor = async (
  event: AwsEvent,
  deps: ConductorDeps = {},
): Promise<Summary> => {
  const library = event.library as ConductorLibrary
  const createRunner = deps.createRunner ?? defaultCreateRunner
  const runProgram = await createRunner(library)

  // Sequential: each testcase spins up its own worker, so we bound peak memory
  // in the Lambda rather than running every evaluator bundle at once.
  const results: Output[] = []
  for (const testcase of event.testcases) {
    const run = await runProgram(assembleProgram(event, testcase), TIMEOUT_DURATION)
    results.push(gradeRun(run, testcase))
  }

  const totalScore = results.reduce<number>(
    (total, result) => (result.resultType === 'pass' ? total + result.score : total),
    0,
  )
  const maxScore = event.testcases.reduce<number>((max, testcase) => testcase.score + max, 0)

  return { totalScore, maxScore, results }
}

function extractErrorMessage(error: unknown): string {
  if (error == null) {
    return 'Unknown conductor error'
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return String(error)
}
