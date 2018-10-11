import { Grader, Student } from './types';

const validStudentCorrect =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  const odd_stream = stream_filter(is_odd, enum_stream(1, 50));
  `

const validStudentWrong =
  `
  const odd_stream = stream_filter(n => n % 2 === 1, list_to_stream(list(1, 2, 3)));
  `

const validStudentPartial =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  const odd_stream = stream_filter(is_odd, stream_append(enum_stream(1, 3), enum_stream(4, 5)));
  `

const invalidStudentRuntime =
  `
  function is_odd(n) {
    return n % 2 === 1;
  }

  // Will stack overflow is_stream
  const odd_stream = stream_filter(is_odd, integers_from(1));
  `

export const student: Student = {
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: null,
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
  `,
  `
  function stream_testcase_c() {
    return !is_empty_list(stream_member(3, odd_stream)) &&
      stream_ref(odd_stream, 1) === 3 ? 1 : 0;
  }
  stream_testcase_c();
  `,
  `
  function stream_testcase_d() {
    return is_stream(odd_stream, 1) ? 1 : 0;
  }
  stream_testcase_d();
  `
]

export const grader: Grader = {
  invalid: {
    runtime: null,
    syntax: null
  },
  valid: validGrader
}
