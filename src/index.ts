import { evaluatorOf, readManifest, runAll as runConductor } from './conductorGrader'
import { runAll as runPython } from './pythonGrader'
import { runAll as runSource } from './sourceGrader'
import { AwsEvent, Summary } from './types'

export * from './types'

// Entry point. An event that names a conductor evaluator the grader has vendored (`library.evaluator`)
// is graded by that evaluator, whatever its language. Otherwise dispatch to the grader for the
// event's language; events without a `language` field default to Python.
export const runAll = (event: AwsEvent): Promise<Summary> =>
  evaluatorOf(event, readManifest())
    ? runConductor(event)
    : event.language === 'javascript'
      ? runSource(event)
      : runPython(event)
