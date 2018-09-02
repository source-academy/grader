/**
 * Here, the student is asked to return a joke string for 2 marks
 * 1 mark is deducted if the student does not use make_funny
 */

import { Grader, Student } from './types'

const validStudentCorrect =
  `const make_joke = str => make_funny(str);`

const validStudentWrong =
  `const make_joke = str => str;`

const validStudentPartial =
  `const make_joke = str => str + ', haha!';`

export const student: Student = {
  invalid: {
  },
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  }
}

const validGrader = [
  `function ek0chei0y1() {
    const result_1 = make_joke("hello") === "hello, haha!" ? 1 : 0;
    __reset_function_count("make_funny");
    make_joke("hello");
    const result_2 = __get_function_count("make_funny") > 0 ? 2 : 1;
    return result_1 * result_2;
  }


  ek0chei0y1();
`
]

export const grader: Grader = {
  invalid: {},
  valid: validGrader
}
