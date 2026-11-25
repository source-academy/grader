import { evaluatorOf, readManifest, runAll as runConductor } from './conductorGrader'
import { runAll as runSource } from './sourceGrader'
import { AwsEvent, Summary } from './types'

export * from './types'

// Entry point. An event is graded by the conductor evaluator it names (`library.evaluator`, or for an
// event that predates those, the one its chapter stands for: legacyEvents.ts) and that the grader has
// vendored. A Source (JavaScript) event that names none has its own grader until it too runs on the
// host (source-academy/grader#420).
export const runAll = (event: AwsEvent): Promise<Summary> =>
  event.language === 'javascript' && !evaluatorOf(event, readManifest())
    ? runSource(event)
    : runConductor(event)
