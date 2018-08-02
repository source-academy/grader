import { grader, student } from './examples/chap1'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory(1)

test('grader OK, student OK, correct', async () => {
  const result = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(result).toEqual([
      {"marks": 1, "resultType": "pass"},
      {"marks": 4, "resultType": "pass"}
  ])
})
