require('./list');

// Constants
var FS = 32000; // Standard sampling rate for all problems

// ---------------------------------------------
// Source API for Students
// ---------------------------------------------

// Data abstractions:
/*

time: real value in seconds  x>0
amplitude: real value -1<=x<=1
duration: real value in seconds 0<x<Infinity

sound: (time -> amplitude) x duration

*/
function make_sourcesound(wave, duration) {
    return pair(wave, duration);
}

function get_wave(sourcesound) {
    return head(sourcesound);
}

function get_duration(sourcesound) {
    return tail(sourcesound);
}

function is_sound(sound) {
    return is_pair(sound) && head(sound) === 'sound';
}

function play(sound) {
    if (!is_sound(sound)) {
        throw new Error("play() expects sound as input, did you forget to sourcesound_to_sound()?");
    }
    return;
}

function stop() {
    return;
}

function cut_sourcesound(sourcesound, duration) {
    var wave = get_wave(sourcesound);
    return make_sourcesound(function(t) {
        if (t >= duration) {
            return 0;
        } else {
            return wave(t);
        }
    }, duration);
}

function sourcesound_to_sound(sourcesound) {
    var sound = pair('sound', sourcesound);
    sound.toString = function() {
        return "[object Sound]";
    }

    return sound;
}

function sound_to_sourcesound(sound) {
    if (!is_sound(sound)) {
        throw new Error("sound_to_sourcesound() expects sound as input, did you forget to sourcesound_to_sound()?");
    }

    return tail(sound);
}

function consecutively(list_of_sounds) {
    if (is_empty_list(list_of_sounds)) {
        return silence(0);
    } else {
        const head_sourcesound = sound_to_sourcesound(head(list_of_sounds));
        const tail_sourcesound = sound_to_sourcesound(consecutively(tail(list_of_sounds)));

        const head_wave = get_wave(head_sourcesound);
        const head_duration = get_duration(head_sourcesound);
        const tail_wave = get_wave(tail_sourcesound);
        const tail_duration = get_duration(tail_sourcesound);

        return sourcesound_to_sound(make_sourcesound(function(t) {
            if (t >= head_duration) {
                return tail_wave(t - head_duration);
            } else {
                return head_wave(t);
            }
        }, head_duration + tail_duration));
    }
}

function simultaneously(list_of_sounds) {
    if (is_empty_list(list_of_sounds)) {
        return silence(0);
    } else {
        const number_of_sounds = length(list_of_sounds);
        const list_of_sourcesounds = map(sound_to_sourcesound, list_of_sounds);
        const max_duration = accumulate(function(sourcesound, longest_duration) {
            return Math.max(longest_duration, get_duration(sourcesound));
        }, 0, list_of_sourcesounds);

        return sourcesound_to_sound(make_sourcesound(function(t) {
            if (t >= max_duration) {
                return 0;
            } else {
                const current_amplitude = accumulate(function(sourcesound, total_amplitude) {
                    return total_amplitude + (get_wave(sourcesound))(t);
                }, 0, list_of_sourcesounds);
                return total_amplitude / number_of_sounds;
            }
        }, max_duration));
    }
}

function noise_sourcesound(duration) {
    const wave = t => t >= duration ? 0 : Math.random() * 2 - 1;
    return make_sourcesound(wave, duration);
}

function noise(duration) {
    return sourcesound_to_sound(noise_sourcesound(duration));
}

function sine_sourcesound(freq, duration) {
    const wave = t => t >= duration ? 0 : Math.sin(2 * Math.PI * t * freq);
    return make_sourcesound(wave, duration);
}

function sine_sound(freq, duration) {
    return sourcesound_to_sound(sine_sourcesound(freq, duration));
}

function constant_sourcesound(constant, duration) {
    const wave = t => t >= duration ? 0 : constant;
    return make_sourcesound(wave, duration);
}

function silence_sourcesound(duration) {
    return constant_sourcesound(0, duration);
}

function high_sourcesound(duration) {
    return constant_sourcesound(1, duration);
}

function silence(duration) {
    return sourcesound_to_sound(silence_sourcesound(duration));
}

function high(duration) {
    return sourcesound_to_sound(high_sourcesound(duration));
}

function invert_sourcesound(sourcesound) {
    var wave = get_wave(sourcesound);
    var duration = get_duration(sourcesound);
    return make_sourcesound(function(t) {
        return -wave(t);
    }, duration);
}

function clamp_sourcesound(sourcesound) {
    var wave = get_wave(sourcesound);
    var duration = get_duration(sourcesound);
    return make_sourcesound(function(t) {
        var a = wave(t);
        if (a > 1) {
            return 1;
        } else if (a < -1) {
            return -1;
        } else {
            return a;
        }
    }, duration);
}

// for mission 14
function letter_name_to_midi_note(note) {
    // we don't consider double flat/ double sharp
    var note = note.split("");
    var res = 12; //MIDI notes for mysterious C0
    var n = note[0].toUpperCase();
    switch(n) {
        case 'D': 
            res = res + 2;
            break;

        case 'E': 
            res = res + 4;
            break;

        case 'F': 
            res = res + 5;
            break;

        case 'G': 
            res = res + 7;
            break;

        case 'A': 
            res = res + 9;
            break;

        case 'B': 
            res = res + 11;
            break;

        default :
            break;
    }

    if (note.length === 2) {
        res = parseInt(note[1]) * 12 + res;
    } else if (note.length === 3) {
        switch (note[1]) {
            case '#':
                res = res + 1;
                break;

            case 'b':
                res = res - 1;
                break;

            default:
                break;
        }
        res = parseInt(note[2]) * 12 + res;
    }

    return res;
}

function letter_name_to_frequency(note) {
    return midi_note_to_frequency(note_to_midi_note(note));
}

function midi_note_to_frequency(note) {
    return 8.1757989156 * Math.pow(2, (note / 12));
}

function square_sourcesound(freq, duration) {
    function fourier_expansion_square(level, t) {
        var answer = 0;
        for (var i = 1; i <= level; i++) {
            answer = answer + Math.sin(2 * Math.PI * (2 * i - 1) * freq * t) / (2 * i - 1);
        }
        return answer;
    }

    function wave(t) {
        if (t >= duration) {
            return 0;
        } else {
            var x = (4 / Math.PI) * fourier_expansion_square(5, t);
            if (x > 1) {
                return 1;
            } else if (x < -1) {
                return -1;
            } else {
                return x;
            }
        }
    }
    return make_sourcesound(wave, duration);
}

function square_sound(freq, duration) {
    return sourcesound_to_sound(square_sourcesound(freq, duration));
}

function triangle_sourcesound(freq, duration) {
    function fourier_expansion_triangle(level, t) {
        var answer = 0;
        for (var i = 0; i < level; i++) {
            answer = answer + Math.pow(-1, i) * Math.sin((2 * i + 1) * t * freq * Math.PI * 2) / Math.pow((2 * i + 1), 2);
        }
        return answer;
    }

    function wave(t) {
        if (t >= duration) {
            return 0;
        } else {
            var x = (8 / Math.PI / Math.PI) * fourier_expansion_triangle(5, t);
            if (x > 1) {
                return 1;
            } else if (x < -1) {
                return -1;
            } else {
                return x;
            }
        }
    }
    return make_sourcesound(wave, duration);
}

function triangle_sound(freq, duration) {
    return sourcesound_to_sound(triangle_sourcesound(freq, duration));
}

function sawtooth_sourcesound(freq, duration) {
    function fourier_expansion_sawtooth(level, t) {
        var answer = 0;
        for (var i = 1; i <= level; i++) {
            answer = answer + Math.sin(2 * Math.PI * i * freq * t) / i;
        }
        return answer;
    }

    function wave(t) {
        if (t >= duration) {
            return 0;
        } else {
            var x = (1 / 2) - (1 / Math.PI) * fourier_expansion_sawtooth(5, t);
            if (x > 1) {
                return 1;
            } else if (x < -1) {
                return -1;
            } else {
                return x;
            }
        }
    }
    return make_sourcesound(wave, duration);
}

function sawtooth_sound(freq, duration) {
    return sourcesound_to_sound(sawtooth_sourcesound(freq, duration));
}

function play_concurrently(sound) {
    if (!is_sound(sound)) {
        throw new Error("play() expects sound as input, did you forget to sourcesound_to_sound()?");
    }
}

// Sound API
global.is_sound = is_sound;
global.make_sourcesound = make_sourcesound;
global.get_wave = get_wave;
global.get_duration = get_duration;
global.play = play;
global.sourcesound_to_sound = sourcesound_to_sound;
global.sound_to_sourcesound = sound_to_sourcesound;
