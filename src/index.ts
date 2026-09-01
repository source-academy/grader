import { runAll as runPython } from './pythonGrader'
import { runAll as runSource } from './sourceGrader'
import { AwsEvent, Summary } from './types'

export * from './types'

// Entry point: dispatch to the grader for the event's language. Events without
// a `language` field default to Python.
export const runAll = (event: AwsEvent): Promise<Summary> =>
  event.language === 'javascript' ? runSource(event) : runPython(event)
