import { Grader, Student } from './types';

const validStudentCorrect =
    `
    function noise_sourcesound(duration) {
        const wave = t => t >= duration ? 0 : math_random() * 2 - 1;
        return make_sourcesound(wave, duration);
    }
    const create_noise = (duration) => sourcesound_to_sound(noise_sourcesound(duration));

    function disciplined_sourcesound(duration) {
        const wave = t => t >= duration ? 0 : math_random() * 2 - 1;
        return make_sourcesound(wave, duration);
    }
    const disciplined_sound = sourcesound_to_sound(disciplined_sourcesound(0.1));
    `

const validStudentWrong =
    `
    function noise_sourcesound(duration) {
        const wave = t => t >= duration ? 0 : math_random() * 2 - 1;
        return make_sourcesound(wave, duration);
    }
    const create_noise = (duration) => noise_sourcesound(duration);

    function disciplined_sourcesound(duration) {
         /* Did not attempt */
    }
    const disciplined_sound = "your answer here";
    `

const validStudentPartial =
    `
    function noise_sourcesound(duration) {
        const wave = t => t >= duration ? 0 : math_random() * 2 - 1;
        return make_sourcesound(wave, duration);
    }
    const create_noise = (duration) => sourcesound_to_sound(noise_sourcesound(duration));

    function disciplined_sourcesound(duration) {
        const wave = t => t >= duration + 0.25 ? 0 : math_random() * 2 - 1;
        return make_sourcesound(wave, duration);
    }
    const disciplined_sound = sourcesound_to_sound(disciplined_sourcesound(0.1));
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
    function sound_testcase_noise() {
        __reset_function_count("play");
        __reset_function_count("sound_to_sourcesound");
        __reset_function_count("sourcesound_to_sound");
        __reset_function_count("get_wave");
        __reset_function_count("get_duration");

        const dot_noise = create_noise(1);
        
        const has_correct_sound_to_sourcesounds = __get_function_count("sound_to_sourcesound") === 0;
        const has_correct_sourcesound_to_sounds = __get_function_count("sourcesound_to_sound") === 1;

        return has_correct_sound_to_sourcesounds && has_correct_sourcesound_to_sounds ? 1 : 0;
    }
    sound_testcase_noise();
`,
`
    function sound_testcase_disciplined_sourcesound() {
        __reset_function_count("play");
        __reset_function_count("sound_to_sourcesound");
        __reset_function_count("sourcesound_to_sound");
        __reset_function_count("get_wave");
        __reset_function_count("get_duration");

        if (disciplined_sourcesound === undefined) {
            return 0;
        } else {}
        const some_sourcesound = disciplined_sourcesound(0.1);
        if (some_sourcesound === undefined) {
            return 0;
        } else {}

        function accumulate_discipline(t, final_marks) {
            const has_discipline = (get_wave(some_sourcesound))(t) === 0;
            return has_discipline ? final_marks : 0;
        }

        const discipline = accumulate(accumulate_discipline, 2, list(0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18));

        return 1 + discipline;
    }
    sound_testcase_disciplined_sourcesound();
`,
`
    function sound_testcase_disciplined_sound() {
        __reset_function_count("play");
        __reset_function_count("sound_to_sourcesound");
        __reset_function_count("sourcesound_to_sound");
        __reset_function_count("get_wave");
        __reset_function_count("get_duration");

        if (disciplined_sound === undefined || !is_pair(disciplined_sound)) {
            return 0;
        } else {}

        if (!is_sound(disciplined_sound)) {
            return 1;
        } else {}

        const disciplined_sourcesound = sound_to_sourcesound(disciplined_sound);

        function accumulate_deductions(t, final_marks) {
            const has_discipline = (get_wave(disciplined_sourcesound))(t) === 0;
            return has_discipline ? final_marks : -1;
        }

        const deductions = accumulate(accumulate_deductions, 0, list(0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18));

        return 2 + deductions;
    }
    sound_testcase_disciplined_sound();
`
]

export const grader: Grader = {
    invalid: {
        runtime: null,
        syntax: null
    },
    valid: validGrader
}
