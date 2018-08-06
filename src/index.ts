import { createContext, runInContext } from 'js-slang'
import { ErrorType, SourceError } from 'js-slang/dist/types'

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

type Output = OutputPass | OutputError

type OutputPass = {
  grade: number
  resultType: 'pass'
}

type OutputError = {
  errors: Array<{
    errorType: 'syntax' | 'runtime'
    line: number
    location: string
  }>
  resultType: 'error'
}

export const run = async (chap: number, stdPrg: string, gdrPrg: string): Promise<Output> => {
  const context = createContext<{}>(chap)
  const program = stdPrg + '\n' + gdrPrg
  const result = await runInContext(program, context, { scheduler: 'preemptive' })
  if (result.status == 'finished') {
    return { resultType: "pass", grade: result.value } as GraderPass
  } else {
    return parseError(context.errors, stdPrg, gdrPrg)
  }
}

export const runAll = async (event: AwsEvent): Promise<GraderOutput[]> => {
  const stdPrg = event.studentProgram
  const promises = event.graderPrograms.map(
    gdrPrg => run(event.library.chapter, stdPrg, gdrPrg)
  )
  const results = await Promise.all(promises)
  return results
}

/**
 * Transforms the given SourceErrors and student, grader programs into an output
 * of @type {OutputError}.
 * @param sourceErrors Non-empty array of SourceErrors.
 * @param stdProg Student program.
 * @param grdProg Grader program.
 */
export const parseError = (
  sourceErrors: Array<SourceError>,
  stdProg: string,
  grdProg: string
): GraderError => {
  const stdProgLines = numLines(stdProg)
  const errors =  sourceErrors.map((err: SourceError) => {
    const line = err.location.end.line
    const location = line <= stdProgLines ? 'student' : 'grader'
    return {
      errorType: err.type.toLowerCase(),
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
export const numLines = (lines: string) => lines.split("\n").length
