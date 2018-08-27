/**
  Utility function that wraps a function and provides two tracking functions
  to allow you to track whether a function has been called
  Type: (fn) -> fn
**/
var table = {};
function track_function(name) {
  if(table[name] !== undefined) {
    reset_count(name);
    return;
  }
  reset_count(name);
  var fn = global[name];
  function wrapped_function(...args) {
    table[name]++;
    return fn(...args);
  };
  global[name] = wrapped_function;
}

function reset_count(name) {
  table[name] = 0;
}

function get_count(name) {
  return table[name];
}

// Used in testing
function make_funny(str) {
  return str + ", haha!";
}

global.__track_function = track_function;
global.__reset_function_count = reset_count;
global.__get_function_count = get_count;
global.make_funny = make_funny;