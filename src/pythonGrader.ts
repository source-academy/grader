import { existsSync } from 'fs'
import * as path from 'path'
import { Worker } from 'worker_threads'

import { AwsEvent, Output, Summary, Testcase } from './types'

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : 3000

// Every question is graded at Python chapter 4, matching the browser Autograder tab.
const PYTHON_VARIANT = 4

export type PythonRunError = {
  errorType: 'runtime' | 'syntax'
  message: string
}

// `lines`: each print()ed line, no trailing newline - the frontend's `consoleLogs`.
export type PythonRunResult = {
  lines: string[]
  error?: PythonRunError
  timedOut: boolean
}

export type PythonProgramRunner = (program: string, timeoutMs: number) => Promise<PythonRunResult>

export type PythonDeps = {
  createRunner?: () => PythonProgramRunner
}

// The single file runTestCaseConductor runs per testcase: prepend, student, a
// `__program__` binding of the student source (for a postpend grader to
// `parse()`), postpend, then the testcase - all sharing scope.
export function assemblePythonProgram(event: AwsEvent, testcase: Testcase): string {
  const studentSourceBinding = `__program__ = ${JSON.stringify(event.studentProgram ?? '')}`
  return [
    event.prependProgram,
    event.studentProgram,
    studentSourceBinding,
    event.postpendProgram,
    testcase.program,
  ]
    .filter(part => typeof part === 'string' && part.trim().length > 0)
    .join('\n')
}

// The last print()ed line, trimmed - what the frontend compares to `answer`.
export function lastPrintedLine(lines: string[]): string {
  return lines.length > 0 ? lines[lines.length - 1].trim() : ''
}

export function gradePythonRun(run: PythonRunResult, testcase: Testcase): Output {
  if (run.timedOut) {
    return { resultType: 'error', errors: [{ errorType: 'timeout' }] }
  }
  if (run.error) {
    return {
      resultType: 'error',
      errors: [
        {
          errorType: run.error.errorType,
          line: 0,
          location: 'unknown',
          errorLine: '',
          errorExplanation: run.error.message,
        },
      ],
    }
  }
  const actual = lastPrintedLine(run.lines)
  return actual === testcase.answer
    ? { resultType: 'pass', score: testcase.score }
    : { resultType: 'fail', expected: testcase.answer, actual }
}

// py2js runs synchronously, so a runaway loop is only stoppable by terminating
// its thread: each program runs in a throwaway worker under a wall-clock watchdog.
const WORKER_SOURCE = `
  const { parentPort, workerData } = require('worker_threads')
  const engine = require(workerData.bundlePath)
  const lines = []
  const onError = e => {
    const isRuntime = e instanceof engine.Py2JsRuntimeError
    parentPort.postMessage({
      error: {
        errorType: isRuntime ? 'runtime' : 'syntax',
        message: isRuntime ? e.name + ': ' + e.message : String((e && e.message) || e),
      },
    })
  }
  try {
    const session = new engine.Py2JsSession(workerData.variant, { onOutput: l => lines.push(l) })
    session.runChunk(workerData.code).then(() => parentPort.postMessage({ lines }), onError)
  } catch (e) {
    onError(e)
  }
`

type WorkerMessage = { lines: string[] } | { error: PythonRunError }

export function workerRunner(bundlePath: string): PythonProgramRunner {
  return (program, timeoutMs) =>
    new Promise<PythonRunResult>(resolve => {
      const worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: { bundlePath, code: program, variant: PYTHON_VARIANT },
      })
      let settled = false
      const finish = (result: PythonRunResult) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        void worker.terminate()
        resolve(result)
      }
      const timer = setTimeout(() => finish({ lines: [], timedOut: true }), timeoutMs)
      worker.on('message', (message: WorkerMessage) =>
        finish(
          'error' in message
            ? { lines: [], error: message.error, timedOut: false }
            : { lines: message.lines, timedOut: false },
        ),
      )
      worker.on('error', (error: Error) =>
        finish({
          lines: [],
          error: { errorType: 'runtime', message: error?.message ?? String(error) },
          timedOut: false,
        }),
      )
    })
}

export function resolveBundlePath(): string {
  if (process.env.PY2JS_BUNDLE_PATH) return process.env.PY2JS_BUNDLE_PATH
  const candidates = [
    path.join(__dirname, '..', 'vendor', 'py2js-bundle.cjs'),
    path.join(__dirname, 'vendor', 'py2js-bundle.cjs'),
  ]
  return candidates.find(existsSync) ?? candidates[0]
}

// Grades a Python event and returns the Summary the backend expects.
export const runAll = async (event: AwsEvent, deps: PythonDeps = {}): Promise<Summary> => {
  const runProgram = (deps.createRunner ?? (() => workerRunner(resolveBundlePath())))()

  // Sequential: one evaluator worker resident at a time.
  const results: Output[] = []
  for (const testcase of event.testcases) {
    const run = await runProgram(assemblePythonProgram(event, testcase), TIMEOUT_DURATION)
    results.push(gradePythonRun(run, testcase))
  }

  const totalScore = results.reduce<number>(
    (total, result) => (result.resultType === 'pass' ? total + result.score : total),
    0,
  )
  const maxScore = event.testcases.reduce<number>((max, testcase) => max + testcase.score, 0)

  return { totalScore, maxScore, results }
}
