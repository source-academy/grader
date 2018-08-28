/**
  Utility function that wraps a function and provides two tracking functions
  to allow you to track whether a function has been called
  Type: (fn) -> fn
**/
var table = {};
const track_function = (name: String) => {
  if (table[name] !== undefined) {
    reset_count(name);
    return;
  }
  reset_count(name);
  var fn = global[name];
  function wrapped_function(...args: any[]): any {
    table[name]++;
    return fn(...args);
  }
  global[name] = wrapped_function;
};

const reset_count = (name: String) => {
  table[name] = 0;
};

const get_count = (name: String) => {
  return table[name];
};

global.__track_function = track_function;
global.__reset_function_count = reset_count;
global.__get_function_count = get_count;
