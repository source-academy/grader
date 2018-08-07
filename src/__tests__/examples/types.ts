export type Grader = {
  invalid: InvalidPrograms<string[]>
  valid: string[]
}

export type Student = {
  invalid: InvalidPrograms<string>
  valid: ValidPrograms
}

type InvalidPrograms<Program> = {
  runtime: Program
  syntax: Program
  timeout?: Program
}

type ValidPrograms = {
  correct: string
  wrong: string
  partial: string
}
