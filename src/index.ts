import { createContext, runInContext } from 'js-slang'
import { ErrorType, SourceError } from 'js-slang/dist/types'

type AwsEvent = {
  chapter: number
  graderProgram: string
  studentProgram: string
}

type AwsContext = {}

type AwsCallback = (e: Error | null, output: GraderOutput) => void

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

export function myHandler(event: AwsEvent, c: AwsContext, callback: AwsCallback) {
  const context = createContext<{}>(event.chapter)
  const program = event.studentProgram + '\n' + event.graderProgram
  const promise = runInContext(program, context, { scheduler: 'preemptive' })
  promise.then(obj => {
    if (obj.status == 'finished') {
      callback(
        null,
        {
          "resultType": "pass",
          "marks": obj.value
        }
      )
    } else {
      callback(null, parseError(context.errors, event.studentProgram, event.graderProgram))
    }
  })
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
