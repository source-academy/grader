/**
 * In this example, the student is asked to implement the naive Fibonacci.
 *
 * The term for f(x) where x <= 0 is specified to be 0. Partial marks are
 * awarded otherwise.
 */

import { Grader, Student } from './types'

const validStudentCorrect =
  `const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2);`

const validStudentWrong =
  `const f = i => i < 3 ? 0 : f(i-1) + f(i-2);`

const validStudentPartial =
  `const f = i => i < 3 ? 1 : f(i-1) + f(i-2);`

const invalidStudentRuntime =
  `const f = i => i === 0 ? 0 : i === 1 || i === 2 ? 1 : f(i-1) + f(i-2);`

const invalidStudentSyntax =
  `const f = i => i === 0 ? 0 : i < 3 ? 1 : f(i-1) + f(i-2)`

export const student: Student = {
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: invalidStudentSyntax
  },
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  }
}

const invalidGraderRuntime =
  `function ek0chei0y1() {
    return g(0) === 0 ? 1 : 0;
  }

  ek0chei0y1();`

const invalidGraderSyntax =
  `function ek0chei0y1() {
    return f(0) === 0 ? 1 : 0;
  }

  ek0chei0y1();`

const validGrader = [
  `function ek0chei0y1() {
    return f(0) === 0 ? 1 : 0;
  }

  ek0chei0y1();`,
  `function ek0chei0y1() {
    const test1 = f(7) === 13;
    const test2 = f(10) === 55;
    const test3 = f(12) === 144;
    return test1 && test2 && test3 ? 4 : 0;
  }

  ek0chei0y1();`
]

export const grader: Grader = {
  invalid: {
    runtime: invalidGraderRuntime,
    syntax: invalidGraderSyntax
  },
  valid: validGrader
}
