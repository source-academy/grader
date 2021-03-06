import { Testcase } from '../index'

export type Grader = {
  validPrepend: string
  invalidPrepend?: InvalidPrograms<string>
  validPostpend: string
  invalidPostpend?: InvalidPrograms<string>
  validTestcases: Testcase[]
  invalidTestcases?: InvalidPrograms<Testcase[]>
}

export type Student = {
  valid: ValidPrograms
  invalid: InvalidPrograms<string>
}

type InvalidPrograms<Program> = {
  runtime: Program
  syntax: Program
  timeout?: Program
}

type ValidPrograms = {
  correct: string
  wrong: string
  partial?: string
}
