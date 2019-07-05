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
function make_sound(wave, duration) {
    return pair(wave, duration);
}

function get_wave(sound) {
    return head(sound);
}

function get_duration(sound) {
    return tail(sound);
}

function is_sound(sound) {
    return is_pair(sound) && is_function(head(sound)) && is_number(tail(sound));
}

function play(sound) {
    if (!is_sound(sound)) {
        throw new Error("play() expects sound as input");
    }
    return;
}

function stop() {
    return;
}

function consecutively(list_of_sounds) {
    if (is_empty_list(list_of_sounds)) {
        return silence(0);
    } else {
        const head_sound = head(list_of_sounds);
        const tail_sound = consecutively(tail(list_of_sounds));

        const head_wave = get_wave(head_sound);
        const head_duration = get_duration(head_sound);
        const tail_wave = get_wave(tail_sound);
        const tail_duration = get_duration(tail_sound);

        return make_sound(t =>
			  t >= head_duration
	                  ? tail_wave(t - head_duration)
			  : head_wave(t),
			  head_duration + tail_duration);
    }
}

function simultaneously(list_of_sounds) {
    if (is_empty_list(list_of_sounds)) {
        return silence(0);
    } else {
        const number_of_sounds = length(list_of_sounds);
        const max_duration = accumulate((sound, longest_duration) => 
					Math.max(longest_duration,
						 get_duration(sound)),
					0, list_of_sounds);

        return make_sound(t => {
	    if (t >= max_duration) {
		return 0;
            } else {
                const current_amplitude = accumulate((sound, total_amplitude) =>
						     total_amplitude +
						     (get_wave(sound))(t),
						     0, list_of_sounds);
                return current_amplitude / number_of_sounds;
            }
        }, max_duration);
    }
}

function noise_sound(duration) {
    const wave = t => t >= duration ? 0 : Math.random() * 2 - 1;
    return make_sound(wave, duration);
}

function sine_sound(freq, duration) {
    const wave = t => t >= duration ? 0 : Math.sin(2 * Math.PI * t * freq);
    return make_sound(wave, duration);
}

function silence_sound(duration) {
    return constant_sound(0, duration);
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

function square_sound(freq, duration) {
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
    return make_sound(wave, duration);
}

function triangle_sound(freq, duration) {
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
    return make_sound(wave, duration);
}

function sawtooth_sound(freq, duration) {
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
    return make_sound(wave, duration);
}

function exponential_decay(decay_period) {
  return function (t) {
    if ((t > decay_period) || (t < 0)) {
      return undefined;
    } else {
      var halflife = decay_period / 8;
      var lambda = Math.log(2) / halflife;
      return Math.pow(Math.E, -lambda * t);
    }
  }
}

function adsr(attack_time, decay_time, sustain_level, release_time) {
  return function (sound) {
    var wave = get_wave(sound);
    var duration = get_duration(sound);
    return make_sound(t =>
		      t < attack_time
		      ? wave(t) * (t / attack_time)
		      : t < attack_time + decay_time
		      ? ((exponential_decay(1 - sustain_level,
					    decay_time))(t - attack_time) +
			 sustain_level) * wave(t)
		      : t < duration - release_time
                      ? wave(t) * sustain_level
	              : t <= duration
		      ? wave(t) * sustain_level *
		      (exponential_decay(release_time))(t - (duration - release_time))
		      : 0,
		     duration);
  };
}

function stacking_adsr(waveform, base_frequency, duration, list_of_envelope) {
  function zip(xs, ys) {
    if (is_empty_list(xs) || is_empty_list(ys)) {
      return [];
    } else {
      const new_pair = pair(head(xs), head(ys));
      return pair(new_pair, zip(tail(xs), tail(ys)));
    }
  }

  const range = build_list(length(list_of_envelope), i => i + 1);
  const multiplier_to_envelopes = zip(list_of_envelope, range);

  const adsr_sounds = map(function(multiplier_to_envelope) {
    const multiplier = head(multiplier_to_envelope);
    const envelope = tail(multiplier_to_envelope);
    const base_sound = waveform(base_frequency * multiplier, duration);
    const adsr_sound = envelope(base_sound);
    return adsr_sound;
  }, multiplier_to_envelopes);

  return simultaneously(adsr_sounds);
}

// instruments for students
function trombone(note, duration) {
  return stacking_adsr(square_sound, midi_note_to_frequency(note), duration,
    list(adsr(0.4, 0, 1, 0),
      adsr(0.6472, 1.2, 0, 0)));
}

function piano(note, duration) {
  return stacking_adsr(triangle_sound, midi_note_to_frequency(note), duration,
    list(adsr(0, 1.03, 0, 0),
      adsr(0, 0.64, 0, 0),
      adsr(0, 0.4, 0, 0)));
}

function bell(note, duration) {
  return stacking_adsr(square_sound, midi_note_to_frequency(note), duration,
    list(adsr(0, 1.2, 0, 0),
      adsr(0, 1.3236, 0, 0),
      adsr(0, 1.5236, 0, 0),
      adsr(0, 1.8142, 0, 0)));
}

function violin(note, duration) {
  return stacking_adsr(sawtooth_sound, midi_note_to_frequency(note), duration,
    list(adsr(0.7, 0, 1, 0.3),
      adsr(0.7, 0, 1, 0.3),
      adsr(0.9, 0, 1, 0.3),
      adsr(0.9, 0, 1, 0.3)));
}

function cello(note, duration) {
  return stacking_adsr(square_sound, midi_note_to_frequency(note), duration,
    list(adsr(0.1, 0, 1, 0.2),
      adsr(0.1, 0, 1, 0.3),
      adsr(0, 0, 0.2, 0.3)));
}

// Sound API
global.is_sound = is_sound;
global.make_sound = make_sound;
global.get_wave = get_wave;
global.get_duration = get_duration;
global.play = play;
global.consecutively = consecutively;
global.simultaneously = simultaneously;

global.sine_sound = sine_sound;
global.square_sound = square_sound;
global.triangle_sound = triangle_sound;
global.sawtooth_sound = sawtooth_sound;

global.letter_name_to_midi_note = letter_name_to_midi_note;
global.midi_note_to_frequency = midi_note_to_frequency;

global.adsr = adsr;
global.stacking_adsr = stacking_adsr;
global.trombone = trombone;
global.piano = piano;
global.bell = bell;
global.violin = violin;
global.cello = cello;


