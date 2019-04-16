import { Grader, Student } from './types';

const validStudentCorrect =
  `function forward_sine(t) {
      return make_point(t, math_sin(t * math_PI));
    }

    function backward_sine(t) {
      return make_point(-t, math_sin(t * math_PI));
    }
    (draw_connected_squeezed_to_window(200))(forward_sine);
    `

const validStudentWrong =
  `function forward_sine(t) {
      return make_point(t, math_sin(t * math_PI));
    }

    function backward_sine(t) {
      return make_point(-t, math_sin(t * math_PI));
    }

    (draw_connected(200))(backward_sine);
    `

export const student: Student = {
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
  },
  invalid: {
    runtime: "a;",
    syntax: "a"
  }
}

const validGrader = [
  {
    program: `__check_canvas(
        draw_connected_squeezed_to_window,
        2000,
        backward_sine,
        50,
        0.80
      );`,
    answer: "true",
    score: 1
  }
]

export const grader: Grader = {
  validPrepend: "",
  validTestcases: validGrader,
  validPostpend: ""
}