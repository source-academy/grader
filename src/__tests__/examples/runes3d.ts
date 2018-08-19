import { Grader, Student } from './types';

const validStudentCorrect =
    `
    const a = () => overlay_frac(0.5, heart_bb, nova_bb);
    const b = () => overlay_frac(0.25, quarter_turn_left(quarter_turn_left(quarter_turn_left(nova_bb))), scale(0.4, heart_bb));
    const c = (p1, p2, p3, p4) => overlay(stack(beside(p1, p2), beside(blank_bb, blank_bb)), stack(beside(blank_bb, blank_bb), beside(p3, p4)));
    function d(rune, n) {
        if (n === 1) {
            return rune;
        } else {
            const bottom = d(rune, n - 1);
            return overlay_frac(1/n, scale(1/n, rune), bottom);
        }
    }
    `

const validStudentWrong =
    `
    const a = () => overlay(nova_bb, heart_bb);
    const b = () => overlay_frac(0.25, quarter_turn_left(quarter_turn_left(quarter_turn_left(nova_bb))), scale(0.3, heart_bb));
    const c = (p1, p2, p3, p4) => overlay(stack(beside(p1, blank_bb), beside(blank_bb, p2)), stack(beside(blank_bb, p3), beside(p4, blank_bb)));
    const d = (rune, n) =>  rune;
    `

const validStudentPartial =
    `
    const a = () => overlay_frac(0.5, heart_bb, nova_bb);
    const b = () => overlay_frac(0.3, quarter_turn_left(quarter_turn_left(quarter_turn_left(nova_bb))), scale(0.4, heart_bb));
    const c = (p1, p2, p3, p4) => overlay(beside(stack(p1, blank_bb), stack(p2, blank_bb)), beside(stack(blank_bb, p3), stack(blank_bb, p4)));
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
        const expected_result = overlay(heart_bb, nova_bb);
        const actual_result = a();
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_a();
`,
`
    function rune_testcase_b() {
        const expected_result = overlay_frac(0.25, quarter_turn_right(nova_bb), scale(0.4, heart_bb));
        const actual_result = b();
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_b();
`,
`
    function rune_testcase_c() {
        const expected_result = overlay(stack(beside(nova_bb, heart_bb), beside(blank_bb, blank_bb)), stack(beside(blank_bb, blank_bb), beside(rcross_bb, circle_bb)));
        const actual_result = c(nova_bb, heart_bb, rcross_bb, circle_bb);
        return __are_pictures_equal(actual_result, expected_result) ? 2 : 0;
    }
    rune_testcase_c();
`,
`
    function rune_testcase_d() {
        function tree(rune, n) {
            if (n === 1) {
                return rune;
            } else {
                const bottom = tree(rune, n - 1);
                return overlay_frac(1/n, scale(1/n, rune), bottom);
            }
        }
        const expected_result = tree(nova_bb, 7);
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