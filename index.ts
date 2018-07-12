import { createContext, runInContext } from 'js-slang'
import { ErrorType, SourceError } from 'js-slang/dist/types'

type AwsEvent = {
  chapter: number
  graderProgram: string
  studentProgram: string
}

type AwsContext = {}

type AwsCallback = (e: Error | null, output: GraderOutput) => void

export type GraderOutput = GraderPass | GraderError

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

const parseError = (sourceErrors: Array<SourceError>, stdProg: string, grdProg: string): GraderError => {
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

export const numLines = (lines: string) => lines.split("\n").length
