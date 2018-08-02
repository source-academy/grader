export type Grader = {
  invalid: InvalidPrograms
  valid: string[]
}

export type Student = {
  invalid: InvalidPrograms
  valid: ValidPrograms
}

type InvalidPrograms = {
  runtime: string
  syntax: string
}

type ValidPrograms = {
  correct: string
  wrong: string
  partial: string
}
