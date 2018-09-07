require("../graphics/curves_library");

function unit_circle(t) {
  return make_point(Math.sin(2 * Math.PI * t), Math.cos(2 * Math.PI * t));
}

function unit_line_at(y) {
  return t => make_point(t, y);
}

function some_shape(t) {
  if (t < 0.5) {
    return make_point(Math.sin(2 * Math.PI * t), Math.cos(2 * Math.PI * t));
  } else {
    return make_point(t, t * 2);
  }
}

function up_line(t) {
  return make_point(0.5, t);
}
function down_line(t) {
  return make_point(0.5, 1 - t);
}
function forward_sine(t) {
  return make_point(t, Math.sin(t * Math.PI));
}
function backward_sine(t) {
  return make_point(-t, Math.sin(t * Math.PI));
}
// (draw_connected_squeezed_to_window(1000))(forward_sine);
// (draw_connected_squeezed_to_window(1000))(backwards_sine);

/* Tests */

const TEST_RESOLUTION = 300;

test("similar curves", async () => {
  // Pass. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 1000;
  const TEST_STUDENT_CURVE = up_line;
  const TEST_SOLUTION_CURVE = down_line;

  // Draw student's curve first
  TEST_DRAW_MODE(TEST_NUM_POINTS)(TEST_STUDENT_CURVE);
  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_SOLUTION_CURVE,
    TEST_RESOLUTION
  );
  expect(results).toEqual(true);
});

test("test same circle", async () => {
  // Pass. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 1000;
  const TEST_STUDENT_CURVE = unit_circle;
  const TEST_SOLUTION_CURVE = unit_circle;

  // Draw student's curve first
  TEST_DRAW_MODE(TEST_NUM_POINTS)(TEST_STUDENT_CURVE);
  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_SOLUTION_CURVE,
    TEST_RESOLUTION
  );
  expect(results).toEqual(true);
});

test("test similar sines", async () => {
  // Fail. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 1000;
  const TEST_STUDENT_CURVE = forward_sine;
  const TEST_SOLUTION_CURVE = backward_sine;

  // Draw student's curve first
  TEST_DRAW_MODE(TEST_NUM_POINTS)(TEST_STUDENT_CURVE);
  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_SOLUTION_CURVE,
    TEST_RESOLUTION
  );
  expect(results).toEqual(false);
});

test("test squeezed sines", async () => {
  const TEST_DRAW_MODE = draw_connected_squeezed_to_window;
  const TEST_NUM_POINTS = 1000;
  const TEST_STUDENT_CURVE = forward_sine;
  const TEST_SOLUTION_CURVE = backward_sine;

  // Draw student's curve first
  TEST_DRAW_MODE(TEST_NUM_POINTS)(TEST_STUDENT_CURVE);
  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_SOLUTION_CURVE,
    300
  );
  expect(results).toEqual(true);
});

test("", async () => {
  // Pass. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 1000;
  const TEST_STUDENT_CURVE = unit_line_at(3);
  const TEST_SOLUTION_CURVE = unit_line_at(3);

  // Draw student's curve first
  TEST_DRAW_MODE(TEST_NUM_POINTS)(TEST_STUDENT_CURVE);
  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_SOLUTION_CURVE,
    TEST_RESOLUTION
  );
  expect(results).toEqual(false);
});

test("", async () => {
  // Fail. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 1000;
  const TEST_STUDENT_CURVE = unit_line_at(10);
  const TEST_SOLUTION_CURVE = unit_line_at(50);

  // Draw student's curve first
  TEST_DRAW_MODE(TEST_NUM_POINTS)(TEST_STUDENT_CURVE);
  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_SOLUTION_CURVE,
    TEST_RESOLUTION
  );
  expect(results).toEqual(false);
});

test("build compressed vertical test", async () => {
  var solution_point_array = draw_connected_full_view(3000)(unit_circle);
  var solutionBitmap = __drawCurve(solution_point_array, 300);
  var results = __build_compressed_vertical(solutionBitmap, 300);
  expect(results).toEqual(["010", "01010", "101", "01010", "010"].join("\n"));
});

test("build compressed horizontal test", async () => {
  var solution_point_array = draw_connected_full_view(3000)(unit_circle);
  var solutionBitmap = __drawCurve(solution_point_array, 300);
  var results = __build_compressed_horizontal(solutionBitmap, 300);
  expect(results).toEqual(["010", "01010", "101", "01010", "010"].join("\n"));
});



/*
[ [ 1, 1, 1, 0, 0 ],
  [ 0, 0, 1, 1, 1 ],
  [ 0, 0, 0, 0, 1 ],
  [ 0, 0, 1, 1, 1 ],
  [ 1, 1, 1, 0, 0 ] ]
*/
test("build compressed vertical sin test", async () => {
  var solution_point_array = draw_connected(3000)(forward_sine);
  var solutionBitmap = __drawCurve(solution_point_array, 300);
  var results = __build_compressed_vertical(solutionBitmap, 300);
  expect(results).toEqual(["10", "010", "01","010", "10"].join("\n"));
});

test("build compressed horizontal sin test", async () => {
  var solution_point_array = draw_connected(3000)(forward_sine);
  var solutionBitmap = __drawCurve(solution_point_array, 20);
  var results = __build_compressed_horizontal(solutionBitmap, 20);
  expect(results).toEqual(["101", "01010","010"].join("\n"));
});
