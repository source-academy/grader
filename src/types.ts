// Language-agnostic types shared across the dispatcher and both graders, whereas language-specific types live in the respective grader module.

// Absent language => 'Source', preserving the original js-slang behaviour.
export type Language = 'Source' | 'Python'

export type Library = {
  chapter: number
  // `external` and `globals` are source-only. RUNES/CURVES/etc. are js-slang graphics modules 
  // graded by rendering to headless WebGL and comparing pixels (picture_mse) - there is
  // no Python equivalent for now, so the Python grader ignores this.
  external: {
    name: 'NONE' | 'RUNES' | 'CURVES' | 'SOUNDS' | 'BINARYTREES' | 'PIXNFLIX'
    symbols: string[]
  }
  globals: Array<string[]>
}

export type Testcase = {
  program: string
  answer: string
  score: number
}

// An event from the backend. `language` defaults to Source when omitted.
export type AwsEvent = {
  language?: Language
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
