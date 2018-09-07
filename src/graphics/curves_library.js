// for the side effects, populating the global namespace;
require('./hi_graph.js');


var canvas = [];

function generateCurve(scaleMode, drawMode, numPoints, func, isFullView){
    // initialize the min/max to extreme values
    var min_x = Infinity;
    var max_x = -Infinity;
    var min_y = Infinity;
    var max_y = -Infinity;
    var curvePosArray = [];

    function evaluator(num, func){
        // func should take input of [0, 1] and output pair(x, y)
        // where x,y is in [0, 1]
        // evaluator has a side effect of recording the max/min
        // x and y value for adjusting the position
        for(var i = 0; i <= num; i += 1){
            var value = func(i / num);
            if ((typeof value !== "object") || (value.length !== 2)
                || (typeof value[0] !== "number") || (typeof value[1] !== "number")) {
                throw "Expected a point, encountered " + value;
            }
            var x = value[0];
            var y = value[1];
            curvePosArray.push([x, y]);
            min_x = Math.min(min_x, x);
            max_x = Math.max(max_x, x);
            min_y = Math.min(min_y, y);
            max_y = Math.max(max_y, y);
        }
        return curvePosArray;
    }

    var raw_points = evaluator(numPoints, func);

    canvas.connected = drawMode == "lines";

    if(scaleMode == "none") {
        canvas = raw_points;
        return raw_points;
    }
    var range_x = (max_x - min_x);
    var range_y = (max_y - min_y);
    var x_scale = 1 / (range_x == 0 ? 1 : range_x);
    var y_scale = 1 / (range_y == 0 ? 1 : range_y);
    if(scaleMode == "fit") {
      var scale_factor = Math.min(x_scale, y_scale);
      x_scale = scale_factor;
      y_scale = scale_factor;
    }
    curvePosArray = raw_points.map(([x, y]) => {
      var new_x = (x - min_x) * x_scale;
      var new_y = (y - min_y) * y_scale;
      return [new_x, new_y];
    });

    canvas = curvePosArray;
    return curvePosArray;
  }

/* We stub in our own drawCurve to:
    improve performance
    Reduce dependencies on node implementations of webgl and canvas
    Let us do fuzzy matching based on the vertices alone
 */
//
function drawCurve(curvePosArray, resolution) {
  var curveBitmap = [];

  // Initialize curveBitMap to 2D array of 0's
  for (var x = 0; x < resolution; x++) {
    if (!curveBitmap[x]) {
      curveBitmap[x] = [];
    }
    for (var y = 0; y < resolution; y++) {
      curveBitmap[x][y] = 0;
    }
  }

  var prevPoint = undefined;
  // For every point in curvePosArray, fill in corresponding pixel in curveBitmap with 1
  for (point of curvePosArray) {
    // skip pixels that are out of bounds
    if(point[0] >= 1 || point[0] < 0 || point[1] >= 1 || point[1] < 0) {
      continue;
    }
    var approx_x = Math.floor(point[0] * resolution);
    var approx_y = Math.floor(point[1] * resolution);
    curveBitmap[approx_x][approx_y] = 1;
    if(curvePosArray.connected == false) {
      continue;
    }

    // Otherwise we have to interpolate between this and the last point
    if(prevPoint) {
      const x_diff = approx_x - prevPoint[0];
      const y_diff = approx_y - prevPoint[1];
      const dist = Math.sqrt(x_diff * x_diff + y_diff * y_diff);
      for(var i = 0; i < dist; i++) {
        const new_x = Math.floor(prevPoint[0] + x_diff * i / dist);
        const new_y = Math.floor(prevPoint[1] + y_diff * i / dist);
        curveBitmap[new_x][new_y] = 1;
      }
    }
    prevPoint = [approx_x, approx_y];
  }
  return curveBitmap;
}

function draw_connected(num){
    return function(func){
        return generateCurve("none", "lines", num, func);
    }
}

function draw_points_on(num){
    return function(func){
        return generateCurve("none", "points", num, func);
    }
}

function draw_points_squeezed_to_window(num){
    return function(func){
        return generateCurve("fit", "points", num, func);
    }
}

function draw_connected_squeezed_to_window(num){
    return function(func){
        return generateCurve("fit", "lines", num, func);
    }
}

function draw_connected_full_view(num) {
    return function(func) {
        return generateCurve("stretch", "lines", num, func, true);
    }
}

function draw_connected_full_view_proportional(num) {
    return function(func) {
        return generateCurve("fit", "lines", num, func, true);
    }
}

function make_point(x, y){
    return [x, y];
}

function x_of(pt){
    return pt[0];
}

function y_of(pt){
    return pt[1];
}

// Checks the solution curve against the "drawn" curve and returns true/false
// Resolution: pixel height/width of bitmap
// Accuracy: fraction of pixels that need to match to be considered as passing
function __check_canvas(draw_mode, num_points, solution_curve,
  resolution=600, accuracy=0.90) {
    // Generate student_curve's bitmap first
    var studentBitmap = drawCurve(canvas, resolution);
    var solution_point_array = (draw_mode(num_points))(solution_curve);
    var solutionBitmap = drawCurve(solution_point_array, resolution);
    const TOTAL_POINTS = resolution * resolution;
    var base = 0;
    var matched_points = 0;
    for (var i = 0; i < resolution; i++) {
      for (var j = 0; j < resolution; j++) {
        if (studentBitmap[i][j] === 0 && solutionBitmap[i][j] === 0) {
          continue;
        }
        base++;
        if( studentBitmap[i][j] === solutionBitmap[i][j]) {
          matched_points++;
        }
      }
    }

    const test_accuracy = matched_points / base;
    // Check fraction of correct points against accuracy tolerance
    if (test_accuracy >= accuracy) {
      return true;
    } else {
      // console.log(`Total points: ${base}`);
      // console.log(`Matched points: ${matched_points}`);
      // console.log(`Test accuracy: ${test_accuracy}`);
      return false;
    }
}

// Checks the solution curve against the "drawn" curve, and returns true/false
// instead of using pixel comparisons, builds a compressed representation of the curve and compares with that.
function __scan_canvas(draw_mode, num_points, solution_curve, resolution=300, horizontal_lines=true, vertical_lines=true) {
  // Generate student_curve's bitmap first
  var studentBitmap = drawCurve(canvas, resolution);
  var solution_point_array = (draw_mode(num_points))(solution_curve);
  var solutionBitmap = drawCurve(solution_point_array, resolution);
  const TOTAL_POINTS = resolution * resolution;
  var base = 0;
  var matched_points = 0;
  for (var i = 0; i < resolution; i++) {
    for (var j = 0; j < resolution; j++) {
      if (studentBitmap[i][j] === 0 && solutionBitmap[i][j] === 0) {
        continue;
      }
      base++;
      if( studentBitmap[i][j] === solutionBitmap[i][j]) {
        matched_points++;
      }
    }
  }

  const test_accuracy = matched_points / base;
  // Check fraction of correct points against accuracy tolerance
  if (test_accuracy >= accuracy) {
    return true;
  } else {
    // console.log(`Total points: ${base}`);
    // console.log(`Matched points: ${matched_points}`);
    // console.log(`Test accuracy: ${test_accuracy}`);
    return false;
  }
}

function build_compressed_horizontal(bitmap, resolution) {
  var intermediate = bitmap.map((_, index) => {
    var row = bitmap.map(col => col[index]);
    return compress_array(row, '');
  });
  return compress_array(intermediate, '\n');
}

function build_compressed_vertical(bitmap, resolution) {
  return compress_array(bitmap.map(arr => compress_array(arr, '')),'\n');
}

// Removes sequential duplicate elements
// compress_array([0,0,0,0,1,1,0,1,1,1,0,1]) -> [0,1,0,1,0,1]
function compress_array(array, separator='') {
  return array.reduce((accumulator, val) => {
    var [prev, result] = accumulator;
    if(val !== prev) {
      result.push(val);
    }
    return [val, result];
  }, [false, []])[1].join(separator);
}

global.make_point = make_point;
global.draw_points_on = draw_points_on;
global.draw_connected = draw_connected;
global.draw_points_squeezed_to_window = draw_points_squeezed_to_window;
global.draw_connected_squeezed_to_window = draw_connected_squeezed_to_window;
global.draw_connected_full_view = draw_connected_full_view;
global.draw_connected_full_view_proportional = draw_connected_full_view_proportional;
global.x_of = x_of;
global.y_of = y_of;
global.__check_canvas = __check_canvas;
global.__scan_canvas = __scan_canvas;
global.__build_compressed_vertical = build_compressed_vertical;
global.__build_compressed_horizontal = build_compressed_horizontal;
global.__drawCurve = drawCurve;
