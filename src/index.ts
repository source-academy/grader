import { runAll as runPython } from './pythonGrader'
import { runAll as runSource } from './sourceGrader'
import { AwsEvent, Summary } from './types'

export * from './types'

// Entry point: dispatch to the grader for the event's language. Events without
// a `language` field default to Source, preserving the original behaviour.
export const runAll = (event: AwsEvent): Promise<Summary> =>
  event.language === 'Python' ? runPython(event) : runSource(event)
