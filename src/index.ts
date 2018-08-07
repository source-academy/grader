import { createContext, runInContext, Result as SourceResult } from 'js-slang'
import { SourceError } from 'js-slang/dist/types'

const TIMEOUT_DURATION = 20000

type AwsEvent = {
  graderPrograms: string[]
  studentProgram: string
  library: Library
}

/**
 * @property globals - an array of two element string arrays. The first element
 *   of this latter array is the identifier for the global var, and the second
 *   element is its javascript value (to be eval'd).
 */
export type Library = {
  chapter: number
  external: {
    name: 'NONE' | 'TWO_DIM_RUNES' | 'THREE_DIM_RUNES' | 'CURVES' | 'SOUND'
    symbols: string[]
  }
  globals: Array<string[]>
}

/**
 * Output is the 'refined' version of a Result.
 *   OutputError - program raises a js-slang SourceError
 *   OutputPass - program raises no errors
 *   OutputTimeout - program has run pass the TIMEOUT_DURATION
 */
type Output = OutputPass | OutputError

type OutputPass = {
  grade: number
  resultType: 'pass'
}

type OutputError = {
  errors: Array<ErrorFromSource | ErrorFromTimeout>
  resultType: 'error'
}

type ErrorFromSource = {
  errorType: 'runtime' | 'syntax'
  line: number
  location: string
}

type ErrorFromTimeout = {
  errorType: 'timeout'
}

/**
 * Result is the 'raw' result of the js-slang interpreter running a
 * student/grader program. It will be transformed into a more 'refined' Output
 * to be returned to a backend.
 */
type Result = SourceResult | TimeoutResult

type TimeoutResult = {
  status: 'timeout'
}

export const runAll = async (event: AwsEvent): Promise<Output[]> => {
  const stdPrg = event.studentProgram
  const promises = event.graderPrograms.map(
    gdrPrg => run(event.library.chapter, stdPrg, gdrPrg)
  )
  const results = await Promise.all(promises)
  return results
}

const run = async (chap: number, stdPrg: string, gdrPrg: string): Promise<Output> => {
  const context = createContext<{}>(chap)
  const program = stdPrg + '\n' + gdrPrg
  const result = await catchTimeouts(runInContext(
    program, context, { scheduler: 'preemptive' }
  ))
  if (result.status === 'finished') {
    return { resultType: "pass", grade: result.value } as OutputPass
  } else if (result.status === 'error') {
    return parseError(context.errors, stdPrg, gdrPrg)
  } else {
    return {
      errors: [ { errorType: 'timeout' } ],
      resultType: 'error'
    }
  }
}

const catchTimeouts = (slangPromise: Promise<Result>): Promise<Result> => {
  const timeoutDuration = process.env.NODE_ENV !== 'test'
    ? TIMEOUT_DURATION
    : 1000 // facilitate testing
  return Promise.race([slangPromise, timeout(timeoutDuration)])
}

const timeout = (msDuration: number): Promise<TimeoutResult> => (
  new Promise(resolve => setTimeout(resolve, msDuration, { status: 'timeout' }))
)

/**
 * Transforms the given SourceErrors and student, grader programs into an output
 * of @type {OutputError}.
 * @param sourceErrors Non-empty array of SourceErrors.
 * @param stdProg Student program.
 * @param grdProg Grader program.
 */
const parseError = (
  sourceErrors: Array<SourceError>,
  stdProg: string,
  grdProg: string
): OutputError => {
  const stdProgLines = numLines(stdProg)
  const errors =  sourceErrors.map((err: SourceError) => {
    const line = err.location.end.line
    const location = line <= stdProgLines ? 'student' : 'grader'
    return {
      errorType: err.type.toLowerCase() as 'syntax' | 'runtime',
      line: location == 'student' ? line : line - stdProgLines,
      location: location
    }
  })
  return {
    "resultType": "error",
    "errors": errors
  }
}

/**
 * Count the number of lines in a given string.
 * @param lines String to count number of lines of.
 */
const numLines = (lines: string) => lines.split("\n").length
