import { Grader, Student } from './types';

const validStudentCorrect =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  const odd_stream = stream_filter(is_odd, integers_from(1));
  `

const validStudentWrong =
  `
  const odd_stream = stream_filter(n => n % 2 === 1, enum_stream(0, 1));
  `

const validStudentPartial =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  const odd_stream = stream_filter(is_odd, enum_stream(1, 5));
  `

export const student: Student = {
  invalid: {
    runtime: null,
    syntax: null
  },
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  }
}

const validGrader = [
  `
  function stream_testcase_a() {
    const lst = stream_to_list(stream_take_max(odd_stream, 3));
    return equal(lst, list(1, 3, 5)) ? 1 : 0;
  }
  stream_testcase_a();
  `,
  `
  function stream_testcase_b() {
    const lst = stream_to_list(stream_take_max(odd_stream, 5));
    return equal(lst, list(1, 3, 5, 7, 9)) ? 2 : 0;
  }
  stream_testcase_b();
  `
]

export const grader: Grader = {
  invalid: {
    runtime: null,
    syntax: null
  },
  valid: validGrader
}
