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
    }
}

const validGrader = [
 `__check_canvas(
        draw_connected_squeezed_to_window,
        2000,
        backward_sine,
        50,
        0.80
      ) ? 1 : 0;
`]

const scanGrader = [
 `__scan_canvas(
        draw_connected_squeezed_to_window,
        300,
        backward_sine,
        50,
      ) ? 1 : 0;
`]

export const grader: Grader = {
    pixel: validGrader,
    scan: validGrader

}