//Reverse engineering streams.js from https://github.com/dionyziz/stream.js/blob/master/lib/index.js
// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
function apply(f, xs) {
    var args = [];
    var len = length(xs);
    for (var i = 0; i < len; i++) {
        args[i] = head(xs);
        xs = tail(xs);
    }
    return f.apply(f, args);
}

// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
var array_to_list = function(arr) {
    var res = [];
    for (var i = arr.length - 1; i >= 0; i--) res = pair(arr[i], res);
    return res;
};

var the_empty_stream = [];
var stream_head = head;

//Fufills a promise and then memoizes the value of that execution.
//LOW-LEVEL FUNCTION, NOT JEDISCRIPT
function force(promise) {
    var res = promise();
    promise = function() {
        return res;
    };
    return res;
}

//
// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
function stream_tail(stream) {
    if (!is_pair(stream) || typeof tail(stream) != 'function')
        throw new Error(
                'stream_tail(stream) expects [element, function()] given ' + stream,
                );
    return force(tail(stream));
}

var stream_null = is_empty_list;
var is_empty_stream = stream_null;

//stream usage tools

//prints the first n terms of the stream to console.
function show_stream(stream, nterms) {
    console.log(eval_stream(stream, nterms));
}

//converts the first n terms of a stream into a list.
function eval_stream(stream, n) {
    var res = [];
    var tstream = stream;
    while (!is_empty_list(tstream) && n > 0) {
        res = pair(head(tstream), res);
        tstream = stream_tail(tstream);
        n--;
    }
    return reverse(res);
}

//returns a finite stream consisting of the first n terms of a stream.
function stream_take(str, n) {
    if (n == 0) return the_empty_stream;
    else
        return pair(head(str), function() {
                return stream_take(stream_tail(str), n - 1);
                });
}

//returns a stream after discarding the first n elements of it.
function stream_drop(
        str,
        n, //renamed from stream_tail
        ) {
    if (n == 0) return str;
    else return stream_drop(stream_tail(str), n - 1);
}

//returns the element in the stream at position pos
function stream_ref(str, pos) {
    return head(stream_drop(str, pos));
}

//returns a infinite stream of k, k, k ....
function stream_constant(k) {
    return pair(k, function() {
            return stream_constant(k);
            });
}

//applies proc to each element of the stream
//returns said result.
function stream_map(proc) {
    arguments.slice = [].slice; //hacks!
    var argstreams = array_to_list(arguments.slice(1, arguments.length)); //emulation!
    if (is_empty_list(head(argstreams))) return the_empty_stream;
    else
        return pair(apply(proc, map(head, argstreams)), function() {
                return apply(stream_map, pair(proc, map(stream_tail, argstreams)));
                });
}

//adds the corresponding elements of each stream.
function add_streams() {
    arguments.slice = [].slice; //hacks!
    //console.log(arguments);
    var argstreams = array_to_list(arguments.slice(0, arguments.length)); //emulation!
    function plus() {
        var res = 0;
        for (var i = 0; i < arguments.length; i++) res += arguments[i];
        return res;
    }
    return apply(stream_map, pair(plus, argstreams));
}

//multiplies the corresponding elements of each stream.
function mul_streams() {
    arguments.slice = [].slice; //hacks!
    var argstreams = array_to_list(arguments.slice(0, arguments.length)); //emulation!
    function mul() {
        var res = 1;
        for (var i = 0; i < arguments.length; i++) res *= arguments[i];
        return res;
    }
    return apply(stream_map, pair(mul, argstreams));
}

//multiplies each element in the stream by k.
function scale_stream(k, stream) {
    return mul_streams(stream_constant(k), stream);
}

var integers = pair(1, function() {
        return add_streams(stream_constant(1), integers);
        });
var non_neg_integers = pair(0, function() {
        return integers;
        });

//appends s2 to s1.
function stream_append(s1, s2) {
    if (stream_null(s1)) return s2;
    else
        return pair(head(s1), function() {
                return stream_append(stream_tail(s1), s2);
                });
}

/*(define (stream-pairs s)
  (if (stream-null? s)
  the-empty-stream
  (stream-append
  (stream-map
  (lambda (sn) 
  (list (stream-car s) sn))
  (stream-cdr s))
  (delay (stream-pairs (stream-cdr s))))))*/

//generates all pairs for a given finite stream. original implementation is bugged.
function stream_pairs(s) {
    if (stream_null(s)) return the_empty_stream;
    else
        return stream_append(
                stream_map(function(sn) {
                    return list(head(s), sn);
                    }, stream_tail(s)),
                pairs(stream_tail(s)),
                );
}

//returns a stream with only elements satisfying pred.
function stream_filter(pred, stream) {
    if (stream_null(stream)) return the_empty_stream;
    else if (pred(head(stream)))
        return pair(head(stream), function() {
                return stream_filter(pred, stream_tail(stream));
                });
    else return stream_filter(pred, stream_tail(stream));
}

//replaces all occurances in the str of a with b.
function replace_stream(str, a, b) {
    var temp;
    if (head(str) === a) temp = b;
    else temp = head(str);
    return pair(temp, function() {
            return replace_stream(stream_tail(str), a, b);
            });
}

//power series operations
var add_series = add_streams;

var scale_series = scale_stream;

function negate_series(s) {
    return scale_series(-1, s);
}

function subtract_series(s1, s2) {
    return add_series(s1, negate_series(s2));
}

// create a (finite) series from a list of coefficients
// the rest of the coefficients will naturally be 0s.
function coeffs_to_series(list_coeffs) {
    var zeros = pair(0, function() {
            return zeros;
            });
    var iter = function(list) {
        if (is_empty_list(list)) return zeros;
        else
            return pair(head(list), function() {
                    return iter(tail(list));
                    });
    };
    return iter(list_coeffs);
}

//converts a list to a finite stream
function list_to_stream(lst) {
    return accumulate(
            function(x, y) {
            return pair(x, function() {
                    return y;
                    });
            },
            [],
            lst,
            );
}

//creates a sequence from a procedure such that the nth term is P(n)
function proc_to_sequence(proc) {
    return stream_map(proc, non_neg_integers);
}

//to transplant...
//(proc init lst ...+)
function foldl(
        proc,
        init, //from left to right
        ) {
    arguments.slice = [].slice; //hacks!
    var argstreams = array_to_list(arguments.slice(2, arguments.length)); //emulation!
    while (
            !is_empty_list(head(argstreams)) //normally it should expect same length (i think), but mine will terminate based on first list.
          ) {
        init = apply(proc, append(map(head, argstreams), list(init)));
        argstreams = map(tail, argstreams);
    }
    return init;
}

function foldr(proc, init) {
    arguments.slice = [].slice; //hacks!
    var argstreams = array_to_list(arguments.slice(2, arguments.length)); //emulation!
    argstreams = map(reverse, argstreams);
    var test = append(list(proc, init), argstreams);
    return apply(foldl, test);
}

global.is_empty_stream = is_empty_stream;
global.show_stream = show_stream;
global.eval_stream = eval_stream;
global.stream_take = stream_take;
global.stream_drop = stream_drop;
global.stream_ref = stream_ref;
global.stream_constant = stream_constant;
global.stream_map = stream_map;
global.add_streams = add_streams;
global.mul_streams = mul_streams;
global.scale_stream = scale_stream;
global.integers = integers;
global.non_neg_integers = non_neg_integers;
global.stream_append = stream_append;
global.stream_pairs = stream_pairs;
global.stream_filter = stream_filter;
global.replace_stream = replace_stream;
global.add_series = add_series;
global.scale_series = scale_series;
global.negate_series = negate_series;
global.subtract_series = subtract_series;
global.coeffs_to_series = coeffs_to_series;
global.list_to_stream = list_to_stream;
global.proc_to_sequence = proc_to_sequence;
global.foldl = foldl;
global.foldr = foldr;
