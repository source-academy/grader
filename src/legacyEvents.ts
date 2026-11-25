// Events from before the backend sent evaluator ids (source-academy/backend#1387, #1391) name their
// language by the position of a language in the language directory (`library.chapter`) and the
// `language` field. This maps such an event to the id of the evaluator that grades it. It goes when
// every event carries an evaluator id (source-academy/grader#421).

import { AwsEvent } from './types'

const DEFAULT_PYTHON_CHAPTER = 4

// For Python, the chapter is the position of its language in the directory: 1 to 4 are Python §1 to
// §4, 5 is Python §4 Typed.
const FIRST_TYPED_CHAPTER = 5

// The evaluator that grades an event that names none; undefined for a Source (JavaScript) event,
// which has its own grader until it too runs on the conductor host (source-academy/grader#420).
export function legacyEvaluatorId(event: AwsEvent): string | undefined {
  if (event.language === 'javascript') return undefined
  const chapter = event.library?.chapter
  if (chapter !== undefined && chapter >= FIRST_TYPED_CHAPTER) return 'python4TypedPy2js'
  return `python${chapter !== undefined && chapter >= 1 ? chapter : DEFAULT_PYTHON_CHAPTER}Py2js`
}
