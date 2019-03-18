/**
 * In this example, the student is asked to implement the naive Fibonacci.
 *
 * The term for f(x) where x <= 0 is specified to be 0. Partial marks are
 * awarded otherwise.
 */

import { Grader, Student } from './types'
import { TestCase } from '../../index'

const validStudentCorrect =
  `const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2);`

const validStudentWrong =
  `const f = i => i < 3 ? 2 : f(i-2) + f(i-3);`

const validStudentPartial =
  `const f = i => i < 3 ? 1 : f(i-1) + f(i-2);`

const invalidStudentRuntime =
  `const f = i => f(j+1);`

const invalidStudentSyntax =
  `const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2)`

// Does not compute fast enough to exceed max call stacks, relies on timeout
const invalidStudentTimeout =
   `const f = i => i < -3 ? 0 : f(i+1) + f(i+2);`

export const student: Student = {
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  },
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: invalidStudentSyntax,
    timeout: invalidStudentTimeout
  }
}

const invalidTestcaseRuntime = [
  {  program: `g(1);`,
  answer: "1",
  score: 1 }
]

const invalidTestcaseSyntax = [
  {  program: `f(1)`,
  answer: "1",
  score: 1 }
]

const validTestcases: TestCase[] = [
  {  program: `f(1);`,
  answer: "1",
  score: 1 },
  {  program: `f(3);`,
  answer: "2",
  score: 1 },
  {  program: `f(5);`,
  answer: "5",
  score: 1 }
]

export const grader: Grader = {
  validPrepend: ``,
  validPostpend: ``,
  validTestcases: validTestcases,
  invalidTestcases: {
    runtime: invalidTestcaseRuntime,
    syntax: invalidTestcaseSyntax
  }
}
