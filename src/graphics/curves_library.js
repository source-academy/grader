// for the side effects, populating the global namespace;
require('./hi_graph.js');

// initialize the min/max to extreme values
var min_x = Infinity;
var max_x = -Infinity;
var min_y = Infinity;
var max_y = -Infinity;

function generateCurve(scaleMode, drawMode, numPoints, func, isFullView){
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
            var x = value[0] * 2 - 1;
            var y = value[1] * 2 - 1;
            curvePosArray.push(x, y);
            min_x = Math.min(min_x, x);
            max_x = Math.max(max_x, x);
            min_y = Math.min(min_y, y);
            max_y = Math.max(max_y, y);
        }
        return curvePosArray;
    }

    return evaluator(numPoints, func);
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

  // Determine the range in x & y axes of the curve
  const range_x = max_x - min_x;
  const range_y = max_y - min_y;

  // console.log(`range_x: ${range_x}`);
  // console.log(`range_y: ${range_y}`);

  // Scale the actual points to fit the bitmap resolution
  /*
  Note edge case where range_x === 0 || range_y === 0 (e.g. unit_line_at(t)). This will
  result in a Divide-By-Zero operation, and thus needs to be handled separately.
  For now, I am simply setting all negative points to 0 and points above `resolution`
  to `resolution`.
  Otherwise if range !== 0, scale the points based on the range.
  ** Suggest to break bitmap abstraction and compare the x or y values directly for edge
  ** cases.
  */
  function scale_and_approximate(val, min_val, max_val, range_val) {
    return range_val === 0
      ? x < 0
        ? 0
        : x > resolution
          ? resolution
          : Math.round(val)
      : Math.round(((val - min_val) / (range_val)) * (resolution - 1));
  }

  // For every point in curvePosArray, fill in corresponding pixel in curveBitmap with 1
  for (var i = 0; i < curvePosArray.length; i+=2) {
    var approx_x = scale_and_approximate(curvePosArray[i], min_x, max_x, range_x);
    var approx_y = scale_and_approximate(curvePosArray[i+1], min_y, max_y, range_y);
    curveBitmap[approx_x][approx_y] = 1;
    // console.log(`Point on bitmap: (${approx_x}, ${approx_y})`);
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
function __check_canvas(draw_mode, num_points, student_curve, solution_curve,
  resolution=600, accuracy=0.99) {
    // Generate student_curve's bitmap and solution_curve's bitmap first
    // to get the same min/max_x/y for scaling points in point_array to the bitmap
    var student_point_array = draw_mode(num_points)(student_curve);
    var solution_point_array = draw_mode(num_points)(solution_curve);

    var studentBitmap = drawCurve(student_point_array, resolution);
    var solutionBitmap = drawCurve(solution_point_array, resolution);

    // Initialize a counter for number of points that match between student and solution
    // Step through all pixels in the bitmap and increment the number of matching points
    // accordingly
    const TOTAL_POINTS = num_points + 1;
    var matched_points = 0;
    for (var i = 0; i < resolution; i++) {
      for (var j = 0; j < resolution; j++) {
        if (studentBitmap[i][j] === 1 && studentBitmap[i][j] === solutionBitmap[i][j]) {
          matched_points++;
        }
      }
    }

    const test_accuracy = matched_points / TOTAL_POINTS;
    console.log(`Total points: ${TOTAL_POINTS}`);
    console.log(`Matched points: ${matched_points}`);
    console.log(`Test accuracy: ${test_accuracy}`);

    // Check fraction of correct points against accuracy tolerance
    if (test_accuracy >= accuracy) {
      return true;
    } else {
      return false;
    }
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