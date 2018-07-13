import { createContext, runInContext } from 'js-slang'
import { ErrorType, SourceError } from 'js-slang/dist/types'

type AwsEvent = {
  chapter: number
  graderPrograms: string[]
  studentProgram: string
}

type GraderOutput = GraderPass | GraderError

type GraderPass = {
  resultType: 'pass'
  marks: number
}

type GraderError = {
  resultType: 'error'
  errors: Array<{
    errorType: ErrorType
    line: number
    location: string
  }>
}

export const run = async (chap: number, stdPrg: string, gdrPrg: string): Promise<GraderOutput> => {
  const context = createContext<{}>(chap)
  const program = stdPrg + '\n' + gdrPrg
  const result = await runInContext(program, context, { scheduler: 'preemptive' })
  if (result.status == 'finished') {
    return { "resultType": "pass", "marks": result.value } as GraderPass
  } else {
    return parseError(context.errors, stdPrg, gdrPrg)
  }
}

export const runAll = async (event: AwsEvent): Promise<GraderOutput[]> => {
  const stdPrg = event.studentProgram
  const promises = event.graderPrograms.map(
    gdrPrg => run(event.chapter, stdPrg, gdrPrg)
  )
  const results = await Promise.all(promises)
  return results
}

/**
 * Transforms the given SourceErrors and student, grader programs into an output
 * of @type {GraderError}.
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
      errorType: err.type,
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
