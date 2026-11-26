// The language-agnostic grader: runs the conductor evaluator that the event names, by its id in the
// language directory, and grades each testcase by what the evaluator says (the last line the program
// prints, or the value of its last expression: the manifest says which). It knows no
// language: what an evaluator is (its script, its file name, its environment) is in
// vendor/evaluators/manifest.json.

import { existsSync, readFileSync } from 'fs'
import * as path from 'path'

import { EvaluatorProcess, EvaluatorRunner, EvaluatorRun, runInEvaluator } from './conductorHost'
import { formatValue } from './formatValue'
import { AwsEvent, Output, OutputError, Summary, Testcase } from './types'

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : 3000

// Each testcase starts a fresh worker, which loads the evaluator itself (the OCaml toplevel is several
// MB, about 0.3 s): the watchdog allows for that on top of `TIMEOUT`. The host cannot see when
// evaluation starts, so the allowance is added to every run.
const STARTUP_ALLOWANCE = process.env.EVALUATOR_STARTUP_ALLOWANCE
  ? parseInt(process.env.EVALUATOR_STARTUP_ALLOWANCE, 10)
  : 2000

// The event has a deadline too: the time the Lambda has left (`getRemainingTimeInMillis` of its
// context, which AWS passes as the second argument of the handler) less this margin, which is for
// returning the Summary. It caps every run, so that a slow event returns the results it has instead
// of being killed with none: the testcases that the deadline cuts off are `timeout` errors.
const DEADLINE_MARGIN_MS = process.env.DEADLINE_MARGIN_MS
  ? parseInt(process.env.DEADLINE_MARGIN_MS, 10)
  : 2000

// An entry of vendor/evaluators/manifest.json, keyed by the evaluator's id in the language directory.
export type ManifestEntry = {
  // The evaluator's script, relative to the manifest.
  script: string
  // The file that the program is served as. A conductor evaluator may go by its extension.
  fileName: string
  // Environment variables for the evaluator.
  env?: Record<string, string>
  // Environment variables that are paths of files, relative to the manifest (the evaluator is given
  // them as absolute paths): the files it loads.
  fileEnv?: Record<string, string>
  // URL -> file, relative to the manifest: what the evaluator downloads from such a URL (a worker
  // script of its own, say) is read from the file, so that grading needs no network.
  files?: Record<string, string>
  // Milliseconds that a run may take on top of `TIMEOUT` for the evaluator to start, which the
  // default (`EVALUATOR_STARTUP_ALLOWANCE`) may not cover: py-slang's Typed evaluator starts a type
  // checker first (the grader used to allow that 15 s). Absent: the default.
  startupAllowanceMs?: number
  // What a testcase's answer is compared with: `output`, the last line that the program prints (the
  // default), or `result`, the value that the evaluator sends as the result of the program (the value
  // of its last expression), formatted by `formatValue`.
  answerFrom?: 'output' | 'result'
  // A line of the program that binds the student's source code, for a postpend grader that parses
  // it: the line with `%s` replaced by the source as a JSON string (a string literal in most
  // languages). Placed after the student's code. Absent: no such line.
  studentSourceBinding?: string
}

export type Manifest = Record<string, ManifestEntry>

export function resolveManifestPath(): string {
  if (process.env.EVALUATOR_MANIFEST_PATH) return process.env.EVALUATOR_MANIFEST_PATH
  const candidates = [
    path.join(__dirname, '..', 'vendor', 'evaluators', 'manifest.json'),
    path.join(__dirname, 'vendor', 'evaluators', 'manifest.json'),
  ]
  return candidates.find(existsSync) ?? candidates[0]
}

export function readManifest(manifestPath: string = resolveManifestPath()): Manifest {
  return existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
}

// The evaluator an event names, by `library.evaluator`; undefined if it is not one the grader has.
export function evaluatorOf(event: AwsEvent, manifest: Manifest): ManifestEntry | undefined {
  const id = event.library?.evaluator
  return id && Object.prototype.hasOwnProperty.call(manifest, id) ? manifest[id] : undefined
}

export function processOf(entry: ManifestEntry, manifestPath: string): EvaluatorProcess {
  const dir = path.dirname(manifestPath)
  const env: Record<string, string> = { ...(entry.env ?? {}) }
  for (const [name, file] of Object.entries(entry.fileEnv ?? {})) env[name] = path.join(dir, file)
  const files: Record<string, string> = {}
  for (const [url, file] of Object.entries(entry.files ?? {})) files[url] = path.join(dir, file)
  return { script: path.join(dir, entry.script), env, files }
}

// The one file that runs per testcase, as the frontend (runTestCase.ts) builds it: prepend, the
// student's code, the binding of its source (if the evaluator has one), postpend and the testcase,
// joined by newlines.
export function assembleProgram(
  event: AwsEvent,
  testcase: Testcase,
  studentSourceBinding?: string,
): string {
  const binding =
    studentSourceBinding === undefined
      ? undefined
      : studentSourceBinding.replace('%s', () => JSON.stringify(event.studentProgram ?? ''))
  return [
    event.prependProgram,
    event.studentProgram,
    binding,
    event.postpendProgram,
    testcase.program,
  ]
    .filter(part => typeof part === 'string' && part.trim().length > 0)
    .join('\n')
}

// The last line that the program printed, trimmed: what the frontend compares to `answer`.
export function lastOutput(outputs: string[]): string {
  return outputs.length > 0 ? outputs[outputs.length - 1].trim() : ''
}

// What the conductor sends of an error is its message: no kind (syntax, type, runtime) and no
// location, so every error is a `runtime` error at no line.
function errorOutput(message: string): OutputError['errors'][number] {
  return {
    errorType: 'runtime',
    line: 0,
    location: 'unknown',
    errorLine: '',
    errorExplanation: message,
  }
}

// What the run produced for the testcase's answer to be compared with.
function actualAnswer(run: EvaluatorRun, answerFrom: ManifestEntry['answerFrom']): string {
  return answerFrom === 'result'
    ? formatValue(run.results[run.results.length - 1])
    : lastOutput(run.outputs)
}

export function gradeRun(
  run: EvaluatorRun,
  testcase: Testcase,
  answerFrom?: ManifestEntry['answerFrom'],
): Output {
  if (run.timedOut) return { resultType: 'error', errors: [{ errorType: 'timeout' }] }
  if (run.failure !== undefined) return { resultType: 'error', errors: [errorOutput(run.failure)] }
  if (run.errors.length > 0) return { resultType: 'error', errors: run.errors.map(errorOutput) }
  const actual = actualAnswer(run, answerFrom)
  return actual === testcase.answer
    ? { resultType: 'pass', score: testcase.score }
    : { resultType: 'fail', expected: testcase.answer, actual }
}

export type ConductorDeps = {
  // The milliseconds that the Lambda has left: its context has this method. Absent: no event deadline.
  getRemainingTimeInMillis?: () => number
  manifest?: Manifest
  manifestPath?: string
  runEvaluator?: EvaluatorRunner
}

// Grades an event with the evaluator it names and returns the Summary the backend expects.
export const runAll = async (event: AwsEvent, deps: ConductorDeps = {}): Promise<Summary> => {
  const manifestPath = deps.manifestPath ?? resolveManifestPath()
  const manifest = deps.manifest ?? readManifest(manifestPath)
  const entry = evaluatorOf(event, manifest)
  if (!entry) {
    throw new Error(
      `No conductor evaluator "${event.library?.evaluator}" is vendored: an event names the evaluator that grades it`,
    )
  }
  const evaluator = processOf(entry, manifestPath)
  const run = deps.runEvaluator ?? runInEvaluator
  const deadline = deps.getRemainingTimeInMillis
    ? Date.now() + deps.getRemainingTimeInMillis() - DEADLINE_MARGIN_MS
    : Infinity

  // Sequential: one evaluator worker resident at a time.
  const results: Output[] = []
  for (const testcase of event.testcases) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      results.push({ resultType: 'error', errors: [{ errorType: 'timeout' }] })
      continue
    }
    const program = assembleProgram(event, testcase, entry.studentSourceBinding)
    const limit = Math.min(
      TIMEOUT_DURATION + (entry.startupAllowanceMs ?? STARTUP_ALLOWANCE),
      remaining,
    )
    results.push(
      gradeRun(await run(evaluator, entry.fileName, program, limit), testcase, entry.answerFrom),
    )
  }

  const totalScore = results.reduce<number>(
    (total, result) => (result.resultType === 'pass' ? total + result.score : total),
    0,
  )
  const maxScore = event.testcases.reduce<number>((max, testcase) => max + testcase.score, 0)
  return { totalScore, maxScore, results }
}
