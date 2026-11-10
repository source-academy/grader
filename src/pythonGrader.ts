import { existsSync } from 'fs'
import * as path from 'path'
import { Worker } from 'worker_threads'

import { AwsEvent, ErrorFromSource, Output, Summary, Testcase } from './types'

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : 3000

// The type checker has its own limit: the first check also starts it, and a submission can be large. A
// check that takes longer is a timeout, not a crash of the whole event.
const CHECK_TIMEOUT_DURATION = process.env.CHECK_TIMEOUT
  ? parseInt(process.env.CHECK_TIMEOUT, 10)
  : 15000

const DEFAULT_PYTHON_VARIANT = 4

// The chapter of a library is the position of its language in the language directory (see the
// backend's Cadet.Assessments.Library): 1 to 4 are Python §1 to §4, 5 is Python §4 Typed. A program of
// Python §4 Typed is type-checked, then runs as Python §4 with its types erased.
const FIRST_TYPED_CHAPTER = 5

export function isTypedChapter(chapter: number): boolean {
  return chapter >= FIRST_TYPED_CHAPTER
}

// The py2js variant that runs a chapter's programs.
export function pythonVariant(chapter: number): number {
  return isTypedChapter(chapter) ? DEFAULT_PYTHON_VARIANT : chapter
}

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

// What grading needs of the type checker: the errors that a program has, each with its line (1-based)
// and message.
export type PythonTypeError = { line: number; message: string }

export type PythonTypeChecker = {
  errors: (program: string) => Promise<PythonTypeError[]>
  dispose: () => void
}

export type PythonDeps = {
  createRunner?: () => PythonProgramRunner
  // Starts the checker for a Python §4 Typed event: once, for all its testcases.
  createChecker?: () => Promise<PythonTypeChecker>
  checkTimeoutMs?: number
}

// The single file runTestCaseConductor runs per testcase: prepend, student, a
// `__program__` binding of the student source (for a postpend grader to
// `parse()`), postpend, then the testcase - all sharing scope.
export function assemblePythonProgram(event: AwsEvent, testcase: Testcase): string {
  return assemblePythonParts(event, testcase)
    .map(part => part.text)
    .join('\n')
}

type ProgramPart = { text: string; location: ErrorFromSource['location'] }

function assemblePythonParts(event: AwsEvent, testcase: Testcase): ProgramPart[] {
  const studentSourceBinding = `__program__ = ${JSON.stringify(event.studentProgram ?? '')}`
  const parts: ProgramPart[] = [
    { text: event.prependProgram, location: 'prepend' },
    { text: event.studentProgram, location: 'student' },
    { text: studentSourceBinding, location: 'unknown' },
    { text: event.postpendProgram, location: 'postpend' },
    { text: testcase.program, location: 'testcase' },
  ]
  return parts.filter(part => typeof part.text === 'string' && part.text.trim().length > 0)
}

// Which part of the assembled program a line (1-based) is in, and the line within that part.
export function locate(
  event: AwsEvent,
  testcase: Testcase,
  line: number,
): { location: ErrorFromSource['location']; line: number } {
  let first = 1
  for (const part of assemblePythonParts(event, testcase)) {
    const lines = part.text.split('\n').length
    if (line < first + lines) return { location: part.location, line: line - first + 1 }
    first += lines
  }
  return { location: 'unknown', line }
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
    const session = new engine.Py2JsSession(workerData.variant, {
      onOutput: l => lines.push(l),
      // A Python §4 Typed program has passed the type checker (in the grader): erase its types.
      ...(workerData.typed ? { beforeValidation: engine.eraseTypesBeforeValidation } : {}),
    })
    session.runChunk(workerData.code).then(() => parentPort.postMessage({ lines }), onError)
  } catch (e) {
    onError(e)
  }
`

type WorkerMessage = { lines: string[] } | { error: PythonRunError }

export function workerRunner(
  bundlePath: string,
  variant: number = DEFAULT_PYTHON_VARIANT,
  typed = false,
): PythonProgramRunner {
  return (program, timeoutMs) =>
    new Promise<PythonRunResult>(resolve => {
      const worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: { bundlePath, code: program, variant, typed },
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

export function resolveCheckerPath(): string {
  if (process.env.PY2JS_CHECKER_PATH) return process.env.PY2JS_CHECKER_PATH
  const candidates = [
    path.join(__dirname, '..', 'vendor', 'TypedPy4Checker.js'),
    path.join(__dirname, 'vendor', 'TypedPy4Checker.js'),
  ]
  return candidates.find(existsSync) ?? candidates[0]
}

// Python §4 Typed's type checker (py-slang's, pyright in a worker thread), from the vendored bundle.
export async function startTypeChecker(
  bundlePath: string = resolveBundlePath(),
  checkerPath: string = resolveCheckerPath(),
): Promise<PythonTypeChecker> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const engine = require(bundlePath)
  const checker = await engine.startNodeChecker(checkerPath)
  return {
    errors: async program =>
      (await checker.check(program))
        .filter((d: { severity: string }) => d.severity === 'error')
        .map((d: { line: number; message: string }) => ({ line: d.line, message: d.message })),
    dispose: () => checker.dispose(),
  }
}

class CheckTimeout extends Error {}

// What `checker.errors` gives, or a rejection after `ms`. The checker keeps working on its own, so it
// is not used again after a timeout (see runAll).
function withinTime<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CheckTimeout()), ms)
  })
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer))
}

// The result of a testcase whose program could not be checked: a timeout, or a checker that failed.
export function checkFailureOutput(error: unknown): Output {
  if (error instanceof CheckTimeout)
    return { resultType: 'error', errors: [{ errorType: 'timeout' }] }
  return {
    resultType: 'error',
    errors: [
      {
        errorType: 'runtime',
        line: 0,
        location: 'unknown',
        errorLine: '',
        errorExplanation: `The type checker failed: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
  }
}

// The type errors of a program, as the result of a testcase that is not run.
export function typeErrorOutput(
  event: AwsEvent,
  testcase: Testcase,
  errors: PythonTypeError[],
): Output {
  const program = assemblePythonProgram(event, testcase).split('\n')
  return {
    resultType: 'error',
    errors: errors.map(error => {
      const where = locate(event, testcase, error.line)
      return {
        errorType: 'syntax' as const,
        line: where.line,
        location: where.location,
        errorLine: program[error.line - 1] ?? '',
        errorExplanation: `Type error: ${error.message}`,
      }
    }),
  }
}

// Grades a Python event and returns the Summary the backend expects.
export const runAll = async (event: AwsEvent, deps: PythonDeps = {}): Promise<Summary> => {
  const chapter = event.library.chapter
  const typed = isTypedChapter(chapter)
  const runProgram = (
    deps.createRunner ?? (() => workerRunner(resolveBundlePath(), pythonVariant(chapter), typed))
  )()

  // The checker is started once, for all the testcases, and only when there is something to check.
  // A checker that cannot be started is a failure of every testcase, not of the event.
  let checker: PythonTypeChecker | undefined
  let checkFailure: Output | undefined
  if (typed && event.testcases.length > 0) {
    try {
      checker = await (deps.createChecker ?? (() => startTypeChecker()))()
    } catch (error) {
      checkFailure = checkFailureOutput(error)
    }
  }

  // Sequential: one evaluator worker resident at a time.
  const results: Output[] = []
  // Once a check has timed out or failed the checker is not used again (it may still be busy with that
  // program, or gone): the testcases after it get the same result, at once.
  try {
    for (const testcase of event.testcases) {
      const program = assemblePythonProgram(event, testcase)
      let errors: PythonTypeError[] = []
      if (checker && !checkFailure) {
        try {
          errors = await withinTime(
            checker.errors(program),
            deps.checkTimeoutMs ?? CHECK_TIMEOUT_DURATION,
          )
        } catch (error) {
          checkFailure = checkFailureOutput(error)
        }
      }
      // A program with type errors is not run: the testcase scores nothing.
      results.push(
        checkFailure ??
          (errors.length > 0
            ? typeErrorOutput(event, testcase, errors)
            : gradePythonRun(await runProgram(program, TIMEOUT_DURATION), testcase)),
      )
    }
  } finally {
    checker?.dispose()
  }

  const totalScore = results.reduce<number>(
    (total, result) => (result.resultType === 'pass' ? total + result.score : total),
    0,
  )
  const maxScore = event.testcases.reduce<number>((max, testcase) => max + testcase.score, 0)

  return { totalScore, maxScore, results }
}
