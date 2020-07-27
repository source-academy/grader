import { awsEventFactory } from "./helpers";
import { runAll } from "../index";

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: "RUNES",
    symbols: [
      "heart",
      "square",
      "nova",
      "beside",
      "stack",
      "show",
      "picture_mse",
      "getReadyWebGLForCanvas",
    ],
  },
  globals: [],
});

test("rune correct", async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: "getReadyWebGLForCanvas('2d');",
      studentProgram: "",
      postpendProgram: "",
      testcases: [
        {
          program: `
picture_mse(show(square), show(square)) < 0.01;
`,
          answer: "true",
          score: 1,
        },
        {
          program: `
picture_mse(show(stack(square, square)), show(beside(square, square))) < 0.01;
`,
          answer: "true",
          score: 1,
        },
        {
          program: `
picture_mse(show(square), show(beside(square, square))) < 0.01;
`,
          answer: "true",
          score: 1,
        },
        {
          program: `
picture_mse(show(heart), show(beside(square, square))) < 0.01;
`,
          answer: "false",
          score: 1,
        },
        {
          program: `
picture_mse(show(heart), show(nova)) < 0.01;
`,
          answer: "false",
          score: 1,
        },
      ],
    })
  );
  expect(results).toMatchInlineSnapshot(`
    Object {
      "results": Array [
        Object {
          "resultType": "pass",
          "score": 1,
        },
        Object {
          "resultType": "pass",
          "score": 1,
        },
        Object {
          "resultType": "pass",
          "score": 1,
        },
        Object {
          "resultType": "pass",
          "score": 1,
        },
        Object {
          "resultType": "pass",
          "score": 1,
        },
      ],
      "totalScore": 5,
    }
  `);
});
