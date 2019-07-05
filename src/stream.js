// stream.js: Supporting streams in the Scheme style, following
//            "stream discipline"
// A stream is either the empty list or a pair whose tail is
// a nullary function that returns a stream.

// Author: Martin Henz

// stream_tail returns the second component of the given pair
// throws an exception if the argument is not a pair
// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
function stream_tail(xs) {
    var tail;
    if (is_pair(xs)) {
        tail = xs[1];
    } else {
        throw new Error("stream_tail(xs) expects a pair as "
            + "argument xs, but encountered " + xs);
    }

    if (typeof tail === "function") {
        return tail();
    } else {
        throw new Error("stream_tail(xs) expects a function as "
            + "the tail of the argument pair xs, "
            + "but encountered " + tail);
    }
}

// is_stream recurses down the stream and checks that it ends with
// the empty list []; does not throw any exceptions
// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
// Lazy? No: is_stream needs to go down the stream
function is_stream(xs) {
    return (array_test(xs) && xs.length === 0)
    || (is_pair(xs) && typeof tail(xs) === "function" &&
            is_stream(stream_tail(xs)));
}

// list_to_stream transforms a given list to a stream
// Lazy? Yes: list_to_stream goes down the list only when forced
function list_to_stream(xs) {
    if (is_empty_list(xs)) {
        return [];
    } else {
        return pair(head(xs),
                    function() {
                        return list_to_stream(tail(xs));
                    });
    }
}

// stream_to_list transforms a given stream to a list
// Lazy? No: stream_to_list needs to force the whole stream
function stream_to_list(xs) {
    if (is_empty_list(xs)) {
        return [];
    } else {
        return pair(head(xs), stream_to_list(stream_tail(xs)));
    }
}

// stream makes a stream out of its arguments
// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
// Lazy? No: In this implementation, we generate first a
//           complete list, and then a stream using list_to_stream
function stream() {
    var the_list = [];
    for (var i = arguments.length - 1; i >= 0; i--) {
        the_list = pair(arguments[i], the_list);
    }
    return list_to_stream(the_list);
}

// stream_length returns the length of a given argument stream
// throws an exception if the argument is not a stream
// Lazy? No: The function needs to explore the whole stream
function stream_length(xs) {
    if (is_empty_list(xs)) {
        return 0;
    } else {
        return 1 + stream_length(stream_tail(xs));
    }
}

// stream_map applies first arg f to the elements of the second
// argument, assumed to be a stream.
// f is applied element-by-element:
// stream_map(f,list_to_stream([1,[2,[]]])) results in
// the same as list_to_stream([f(1),[f(2),[]]])
// stream_map throws an exception if the second argument is not a
// stream, and if the second argument is a non-empty stream and the
// first argument is not a function.
// Lazy? Yes: The argument stream is only explored as forced by
//            the result stream.
function stream_map(f, s) {
    if (is_empty_list(s)) {
       return [];
    } else {
        return pair(f(head(s)),
                    function() {
                        return stream_map(f, stream_tail(s));
                    });
    }
}

// build_stream takes a non-negative integer n as first argument,
// and a function fun as second argument.
// build_list returns a stream of n elements, that results from
// applying fun to the numbers from 0 to n-1.
// Lazy? Yes: The result stream forces the applications of fun
//            for the next element
function build_stream(n, fun) {
    function build(i) {
        if (i >= n) {
            return [];
        } else {
            return pair(fun(i),
                        function() {
                            return build(i + 1);
                        });
        }
    }
    return build(0);
}

// stream_for_each applies first arg fun to the elements of the list
// passed as second argument. fun is applied element-by-element:
// for_each(fun,list_to_stream([1,[2,[]]])) results in the calls fun(1)
// and fun(2).
// stream_for_each returns true.
// stream_for_each throws an exception if the second argument is not a list,
// and if the second argument is a non-empty list and the
// first argument is not a function.
// Lazy? No: stream_for_each forces the exploration of the entire stream
function stream_for_each(fun, xs) {
    if (is_empty_list(xs)) {
        return true;
    } else {
        fun(head(xs));
        return stream_for_each(fun, stream_tail(xs));
    }
}

// stream_reverse reverses the argument stream
// stream_reverse throws an exception if the argument is not a stream.
// Lazy? No: stream_reverse forces the exploration of the entire stream
function stream_reverse(xs) {
    function rev(original, reversed) {
        if (is_empty_list(original)) {
            return reversed;
        } else {
            return rev(stream_tail(original),
                       pair(head(original), function() { return reversed; }));
        }
    }
    return rev(xs,[]);
}

// stream_to_vector returns vector that contains the elements of the argument
// stream in the given order.
// stream_to_vector throws an exception if the argument is not a stream
// LOW-LEVEL FUNCTION, NOT JEDISCRIPT
// Lazy? No: stream_to_vector forces the exploration of the entire stream
function stream_to_vector(lst){
    var vector = [];
    while (!is_empty_list(lst)) {
        vector.push(head(lst));
        lst = stream_tail(lst);
    }
    return vector;
}

// stream_append appends first argument stream and second argument stream.
// In the result, the [] at the end of the first argument stream
// is replaced by the second argument stream
// stream_append throws an exception if the first argument is not a
// stream.
// Lazy? Yes: the result stream forces the actual append operation
function stream_append(xs, ys) {
    if (is_empty_list(xs)) {
        return ys;
    } else {
        return pair(head(xs),
                    function() {
                        return stream_append(stream_tail(xs), ys);
                    });
    }
}

// stream_member looks for a given first-argument element in a given
// second argument stream. It returns the first postfix substream
// that starts with the given element. It returns [] if the
// element does not occur in the stream
// Lazy? Sort-of: stream_member forces the stream only until the element is found.
function stream_member(x, s) {
    if (is_empty_list(s)) {
        return [];
    } else if (head(s) === x) {
        return s;
    } else {
        return stream_member(x, stream_tail(s));
    }
}

// stream_remove removes the first occurrence of a given first-argument element
// in a given second-argument list. Returns the original list
// if there is no occurrence.
// Lazy? Yes: the result stream forces the construction of each next element
function stream_remove(v, xs) {
    if (is_empty_list(xs)) {
        return [];
    } else if (v === head(xs)) {
        return stream_tail(xs);
    } else {
        return pair(head(xs),
                    function() {
                        return stream_remove(v, stream_tail(xs));
                    });
    }
}

// stream_remove_all removes all instances of v instead of just the first.
// Lazy? Yes: the result stream forces the construction of each next element
function stream_remove_all(v, xs) {
    if (is_empty_list(xs)) {
        return [];
    } else if (v === head(xs)) {
        return stream_remove_all(v, stream_tail(xs));
    } else {
        return pair(head(xs), function() {
            return stream_remove_all(v, stream_tail(xs));
        });
    }
}

// filter returns the substream of elements of given stream s
// for which the given predicate function p returns true.
// Lazy? Yes: The result stream forces the construction of
//            each next element. Of course, the construction
//            of the next element needs to go down the stream
//            until an element is found for which p holds.
function stream_filter(p, s) {
    if (is_empty_list(s)) {
        return [];
    } else if (p(head(s))) {
        return pair(head(s),
                    function() {
                        return stream_filter(p, stream_tail(s));
                    });
    } else {
        return stream_filter(p, stream_tail(s));
    }
}

// enumerates numbers starting from start,
// using a step size of 1, until the number
// exceeds end.
// Lazy? Yes: The result stream forces the construction of
//            each next element
function enum_stream(start, end) {
    if (start > end) {
        return [];
    } else {
        return pair(start,
                    function() {
                        return enum_stream(start + 1, end);
                    });
    }
}

// integers_from constructs an infinite stream of integers
// starting at a given number n
// Lazy? Yes: The result stream forces the construction of
//            each next element
function integers_from(n) {
    return pair(n,
                function() {
                    return integers_from(n + 1);
                });
}

// eval_stream constructs the list of the first n elements
// of a given stream s
// Lazy? Sort-of: eval_stream only forces the computation of
//                the first n elements, and leaves the rest of
//                the stream untouched.
function eval_stream(s, n) {
    if (n === 0) {
        return [];
    } else {
        return pair(head(s),
                    eval_stream(stream_tail(s),
                                n - 1));
   }
}

// Returns the item in stream s at index n (the first item is at position 0)
// Lazy? Sort-of: stream_ref only forces the computation of
//                the first n elements, and leaves the rest of
//                the stream untouched.
function stream_ref(s, n) {
    if (n === 0) {
        return head(s);
    } else {
        return stream_ref(stream_tail(s), n - 1);
    }
}

function stream_take_max(str, n) {
  return is_empty_list(str) || n === 0
    ? []
    : pair(head(str), () => stream_take_max(stream_tail(str), n - 1));
}

global.stream_tail = stream_tail;
global.is_stream = is_stream;
global.list_to_stream = list_to_stream;
global.stream_to_list = stream_to_list;
global.stream = stream;
global.stream_length = stream_length;
global.stream_map = stream_map;
global.build_stream = build_stream;
global.stream_for_each = stream_for_each;
global.stream_reverse = stream_reverse;
global.stream_to_vector = stream_to_vector;
global.stream_append = stream_append;
global.stream_member = stream_member;
global.stream_remove = stream_remove;
global.stream_remove_all = stream_remove_all;
global.stream_filter = stream_filter;
global.enum_stream = enum_stream;
global.integers_from = integers_from;
global.eval_stream = eval_stream;
global.stream_ref = stream_ref;
global.stream_take_max = stream_take_max;
