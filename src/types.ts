// The types of the grader's input and output. The grader knows no language: an event names the evaluator
// that grades it (`library.evaluator`, an id in the language directory), and the grader runs it.

export type Library = {
  // The backend grader's language and evaluator, by their ids in the language directory
  // (source-academy/backend#1387, #1391). The evaluator must be one the grader has vendored
  // (vendor/evaluators/manifest.json). The event has more (`chapter`, `runtime`, `userLibrary`, ...):
  // the grader does not read it.
  language?: string | null
  evaluator?: string | null
}

export type Testcase = {
  program: string
  answer: string
  score: number
}

// An event from the backend.
export type AwsEvent = {
  library: Library
  prependProgram: string
  studentProgram: string
  postpendProgram: string
  testcases: Testcase[]
}

// The JSON object the backend receives.
export type Summary = {
  totalScore: number
  maxScore: number
  results: Output[]
}

// Refined, backend-facing result for one testcase.
export type Output = OutputPass | OutputFail | OutputError

export type OutputPass = {
  resultType: 'pass'
  score: number
}

export type OutputFail = {
  resultType: 'fail'
  expected: string
  actual: string
}

export type OutputError = {
  resultType: 'error'
  errors: Array<ErrorFromSource | ErrorFromTimeout>
}

export type ErrorFromSource = {
  errorType: 'runtime' | 'syntax'
  line: number
  location: 'prepend' | 'student' | 'postpend' | 'testcase' | 'unknown'
  errorLine: string
  errorExplanation: string
}

export type ErrorFromTimeout = {
  errorType: 'timeout'
}
