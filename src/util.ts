var table = {};
// to stop typescript complaining
const globalAny:any = global;

/**
  Utility function that wraps a function and provides two tracking functions
  to allow you to track whether a function has been called
  Type: (fn) -> fn
**/
const track_function = (name: string) => {
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

const reset_count = (name: string) => {
  table[name] = 0;
};

const get_count = (name: string) => {
  return table[name];
};

globalAny.__track_function = track_function;
globalAny.__reset_function_count = reset_count;
globalAny.__get_function_count = get_count;
