import { grader, student } from './examples/chap1'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 1,
  external: {
    name: 'NONE',
    symbols: []
  },
  globals: [[]]
})

test('grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
      {'grade': 1, 'resultType': 'pass'},
      {'grade': 4, 'resultType': 'pass'}
  ])
})

test('grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 4, 'resultType': 'pass'}
  ])
})

test('grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
      {'grade': 0, 'resultType': 'pass'},
      {'grade': 0, 'resultType': 'pass'}
  ])
})

test('grader OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.invalid.runtime))
  results.map(result => {
    // One result per student program, each result is a GraderError
    expect(result.resultType).toBe('error')
    // each GraderError is a runtimeError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'runtime',
      line: 1,
      location: 'student'
    }))
  })
})

test('grader OK, student timeoutError', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.invalid.timeout))
  results.map(result => {
    expect(result.resultType).toBe('timeout')
  })
}, 10000)

test('grader OK, student syntaxError', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.invalid.syntax))
  results.map(result => {
    // One result per student program, each result is a GraderError
    expect(result.resultType).toBe('error')
    // each GraderError is a syntaxError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'syntax',
      line: 1,
      location: 'student'
    }))
  })
})

test('grader runtimeError, student OK', async () => {
  const results = await runAll(makeAwsEvent(grader.invalid.runtime, student.valid.correct))
  results.map(result => {
    // One result per student program, each result is a GraderError
    expect(result.resultType).toBe('error')
    // each GraderError is a runtimeError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'runtime',
      line: 2,
      location: 'grader'
    }))
  })
})

test('grader syntaxError, student OK', async () => {
  const results = await runAll(makeAwsEvent(grader.invalid.syntax, student.valid.correct))
  results.map(result => {
    // One result per student program, each result is a GraderError
    expect(result.resultType).toBe('error')
    // each GraderError is a runtimeError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'syntax',
      line: 5,
      location: 'grader'
    }))
  })
})
