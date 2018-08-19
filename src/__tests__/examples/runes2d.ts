import { Grader, Student } from './types';

const validStudentCorrect =
    `
    const a = () => blue(quarter_turn_left(quarter_turn_left(quarter_turn_left(nova_bb))));
    const b = () => stack(quarter_turn_right(nova_bb), quarter_turn_right(nova_bb));
    const c = (p1, p2, p3, p4) => beside(stack(p1, p2), stack(p3, p4));
    function d(rune, n) {
        if (n === 1) {
            return rune;
        } else {
            return beside(rune, stack(d(rune, n - 1), d(rune, n - 1)));
        }
    }
    `

const validStudentWrong =
    `
    const a = () => quarter_turn_left(nova_bb);
    const b = () => stack(quarter_turn_left(nova_bb), quarter_turn_right(nova_bb));
    const c = (p1, p2, p3, p4) => beside(stack(p2, p1), stack(p4, p3));
    const d = (rune, n) =>  rune;
    `

const validStudentPartial =
    `
    const a = () => blue(quarter_turn_right(nova_bb));
    const b = () => stack(quarter_turn_left(nova_bb), quarter_turn_left(nova_bb));
    const c = (p1, p2, p3, p4) => stack(beside(p1, p3), beside(p2, p4));
    const d = (rune, n) => (n === 1) ? rune : beside(rune, stack(d(rune, n - 1), d(rune, n - 1)));
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
    function rune_testcase_a() {
        const expected_result = quarter_turn_right(blue(nova_bb));
        const actual_result = a();
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_a();
`,
`
    function rune_testcase_b() {
        const expected_result = stack(quarter_turn_right(nova_bb), quarter_turn_right(nova_bb));
        const actual_result = b();
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_b();
`,
`
    function rune_testcase_c() {
        const expected_result = beside(stack(nova_bb, heart_bb), stack(rcross_bb, circle_bb));
        const actual_result = c(nova_bb, heart_bb, rcross_bb, circle_bb);
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_c();
`,
`
    function rune_testcase_d() {
        function fractal(rune, n) {
            if (n === 1) {
                return rune;
            } else {
                const pic = fractal(rune, n - 1);
                return beside(rune, stack(pic, pic));
            }
        }
        const expected_result = fractal(nova_bb, 7);
        const actual_result = d(nova_bb, 7);
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_d();
`,
]

export const grader: Grader = {
    invalid: {
        runtime: null,
        syntax: null
    },
    valid: validGrader
}