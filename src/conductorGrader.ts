// The language-agnostic grader: runs the conductor evaluator that the event names, by its id in the
// language directory, and grades each testcase by the last line the program prints. It knows no
// language: what an evaluator is (its script, its file name, its environment) is in
// vendor/evaluators/manifest.json.

import { existsSync, readFileSync } from 'fs'
import * as path from 'path'

import { EvaluatorProcess, EvaluatorRunner, EvaluatorRun, runInEvaluator } from './conductorHost'
import { AwsEvent, Output, Summary, Testcase } from './types'

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : 3000

// An evaluator's first program also loads the evaluator itself (the OCaml toplevel is several MB),
// which a testcase's own limit should not have to cover.
const STARTUP_ALLOWANCE = process.env.EVALUATOR_STARTUP_ALLOWANCE
  ? parseInt(process.env.EVALUATOR_STARTUP_ALLOWANCE, 10)
  : 10000

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
  return { script: path.join(dir, entry.script), env }
}

// The one file that runs per testcase, as the frontend (runTestCase.ts) and the other graders
// build it: prepend, the student's code, postpend and the testcase, joined by newlines.
export function assembleProgram(event: AwsEvent, testcase: Testcase): string {
  return [event.prependProgram, event.studentProgram, event.postpendProgram, testcase.program]
    .filter(part => typeof part === 'string' && part.trim().length > 0)
    .join('\n')
}

// The last line that the program printed, trimmed: what the frontend compares to `answer`.
export function lastOutput(outputs: string[]): string {
  return outputs.length > 0 ? outputs[outputs.length - 1].trim() : ''
}

export function gradeRun(run: EvaluatorRun, testcase: Testcase): Output {
  if (run.timedOut) return { resultType: 'error', errors: [{ errorType: 'timeout' }] }
  const message = run.failure ?? run.errors[0]
  if (message !== undefined) {
    return {
      resultType: 'error',
      errors: [
        {
          errorType: 'runtime',
          line: 0,
          location: 'unknown',
          errorLine: '',
          errorExplanation: message,
        },
      ],
    }
  }
  const actual = lastOutput(run.outputs)
  return actual === testcase.answer
    ? { resultType: 'pass', score: testcase.score }
    : { resultType: 'fail', expected: testcase.answer, actual }
}

export type ConductorDeps = {
  manifest?: Manifest
  manifestPath?: string
  runEvaluator?: EvaluatorRunner
}

// Grades an event with the evaluator it names and returns the Summary the backend expects.
export const runAll = async (event: AwsEvent, deps: ConductorDeps = {}): Promise<Summary> => {
  const manifestPath = deps.manifestPath ?? resolveManifestPath()
  const manifest = deps.manifest ?? readManifest(manifestPath)
  const entry = evaluatorOf(event, manifest)
  if (!entry) throw new Error(`No conductor evaluator "${event.library?.evaluator}" is vendored`)
  const evaluator = processOf(entry, manifestPath)
  const run = deps.runEvaluator ?? runInEvaluator

  // Sequential: one evaluator worker resident at a time.
  const results: Output[] = []
  let first = true
  for (const testcase of event.testcases) {
    const program = assembleProgram(event, testcase)
    const allowance = first ? STARTUP_ALLOWANCE : 0
    first = false
    results.push(
      gradeRun(
        await run(evaluator, entry.fileName, program, TIMEOUT_DURATION + allowance),
        testcase,
      ),
    )
  }

  const totalScore = results.reduce<number>(
    (total, result) => (result.resultType === 'pass' ? total + result.score : total),
    0,
  )
  const maxScore = event.testcases.reduce<number>((max, testcase) => max + testcase.score, 0)
  return { totalScore, maxScore, results }
}
