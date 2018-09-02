var table = {};
// to stop typescript complaining
const globalAny:any = global;

/**
  Utility function that wraps a function and provides two tracking functions
  to allow you to track whether a function has been called
  Type: (fn) -> fn

  To use in a grader function, remember to include this in the globals so the tracking function gets overridden before the values are bound. For instance, to track make_point, add:

  <EXTERNAL name="CURVES">

      <SYMBOL>make_point</SYMBOL>
      ...
      <SYMBOL>__reset_function_count</SYMBOL>
      <SYMBOL>__get_function_count</SYMBOL>
  </EXTERNAL>
  <GLOBAL>
    <IDENTIFIER>__tracking_function_initializer</IDENTIFIER>
    <VALUE>global.__track_function("make_point");</VALUE>
  </GLOBAL>

  And you will be able to use __reset_function_count and __get_function_count in your functions.
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
