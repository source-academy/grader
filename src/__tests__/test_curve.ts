import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 2,
  external: {
    name: 'CURVES',
    symbols: [
      'draw_connected_full_view_proportional',
      'unit_circle',
      'unit_line',
      'picture_mse'
    ]
  },
  globals: []
})

test('curve correct', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: '',
      postpendProgram: '',
      testcases: [
        {
          program: `picture_mse(draw_connected_full_view_proportional(200)(unit_circle), draw_connected_full_view_proportional(200)(unit_circle)) < 0.0001;`,
          answer: 'true',
          score: 1
        },
        {
          program: `picture_mse(draw_connected_full_view_proportional(200)(unit_circle), draw_connected_full_view_proportional(200)(unit_line)) < 0.0001;`,
          answer: 'false',
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
      ],
      "totalScore": 2,
    }
  `)
})
