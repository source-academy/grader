import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: 'RUNES',
    symbols: [
      'heart',
      'square',
      'nova',
      'beside',
      'stack',
      'show',
      'picture_mse',
      'getReadyWebGLForCanvas'
    ]
  },
  globals: []
})

test('rune correct', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: '',
      postpendProgram: '',
      testcases: [
        {
          program: `
picture_mse(show(square), show(square)) < 0.01;
`,
          answer: 'true',
          score: 1
        },
        {
          program: `
picture_mse(show(stack(square, square)), show(beside(square, square))) < 0.01;
`,
          answer: 'true',
          score: 1
        },
        {
          program: `
picture_mse(show(square), show(beside(square, square))) < 0.01;
`,
          answer: 'true',
          score: 1
        },
        {
          program: `
picture_mse(show(heart), show(beside(square, square))) < 0.01;
`,
          answer: 'false',
          score: 1
        },
        {
          program: `
picture_mse(show(heart), show(nova)) < 0.01;
`,
          answer: 'false',
          score: 1
        },
        {
          program: `
function mosaic(r1, r2, r3, r4){
    return beside(stack(r4, r3), stack(r1, r2));
}
function steps(r1, r2, r3, r4){
    return mosaic(overlay_frac(3 / 4, blank, r1),
                  overlay(blank, r2),
                  overlay_frac(1 / 4, blank, r3),
                  r4);
}
picture_mse(show(steps(rcross, sail, corner, nova)),
            show(mosaic(rcross, sail, corner, nova))) > 0;
`,
          answer: 'true',
          score: 1
        }
      ]
    })
  )
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
        Object {
          "resultType": "pass",
          "score": 1,
        },
      ],
      "totalScore": 5,
    }
  `)
})
