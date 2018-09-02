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
// (draw_connected_squeezed_to_window(200))(forward_sine);
// (draw_connected_squeezed_to_window(200))(backwards_sine);

/* Tests */

test("similar curves", async () => {
  // Pass. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 200;
  const TEST_STUDENT_CURVE = up_line;
  const TEST_SOLUTION_CURVE = down_line;

  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_STUDENT_CURVE,
    TEST_SOLUTION_CURVE
  );
  expect(results).toEqual(true);
});

test("test same circle", async () => {
  // Pass. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 200;
  const TEST_STUDENT_CURVE = unit_circle;
  const TEST_SOLUTION_CURVE = unit_circle;

  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_STUDENT_CURVE,
    TEST_SOLUTION_CURVE
  );
  expect(results).toEqual(true);
});

test("test similar sines", async () => {
  // Fail. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 200;
  const TEST_STUDENT_CURVE = forward_sine;
  const TEST_SOLUTION_CURVE = backward_sine;

  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_STUDENT_CURVE,
    TEST_SOLUTION_CURVE
  );
  expect(results).toEqual(false);
});

test("test squeezed sines", async () => {
  const TEST_DRAW_MODE = draw_connected_squeezed_to_window;
  const TEST_NUM_POINTS = 200;
  const TEST_STUDENT_CURVE = forward_sine;
  const TEST_SOLUTION_CURVE = backward_sine;

  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_STUDENT_CURVE,
    TEST_SOLUTION_CURVE
  );
  expect(results).toEqual(true);
});

test("", async () => {
  // Pass. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 200;
  const TEST_STUDENT_CURVE = unit_line_at(3);
  const TEST_SOLUTION_CURVE = unit_line_at(3);

  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_STUDENT_CURVE,
    TEST_SOLUTION_CURVE
  );
  expect(results).toEqual(true);
});

test("", async () => {
  // Fail. Expected.
  const TEST_DRAW_MODE = draw_connected;
  const TEST_NUM_POINTS = 200;
  const TEST_STUDENT_CURVE = unit_line_at(10);
  const TEST_SOLUTION_CURVE = unit_line_at(50);

  const results = __check_canvas(
    TEST_DRAW_MODE,
    TEST_NUM_POINTS,
    TEST_STUDENT_CURVE,
    TEST_SOLUTION_CURVE
  );
  expect(results).toEqual(false);
});
