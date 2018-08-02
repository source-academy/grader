import { grader, student } from './examples/chap1'
import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory(1)

test('grader OK, student OK, correct', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.correct))
  expect(results).toEqual([
      {'marks': 1, 'resultType': 'pass'},
      {'marks': 4, 'resultType': 'pass'}
  ])
})

test('grader OK, student OK, partial', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.partial))
  expect(results).toEqual([
      {'marks': 0, 'resultType': 'pass'},
      {'marks': 4, 'resultType': 'pass'}
  ])
})

test('grader OK, student OK, wrong', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.valid.wrong))
  expect(results).toEqual([
      {'marks': 0, 'resultType': 'pass'},
      {'marks': 0, 'resultType': 'pass'}
  ])
})

test('grader OK, student runtimeError', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.invalid.runtime))
  results.map(result => {
    // One result per student program, each result is a GraderError
    expect(result.resultType).toBe('error')
    // each GraderError is a RuntimeError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'Runtime',
      line: 1,
      location: 'student'
    }))
  })
})

test('grader OK, student syntaxError', async () => {
  const results = await runAll(makeAwsEvent(grader.valid, student.invalid.syntax))
  results.map(result => {
    // One result per student program, each result is a GraderError
    expect(result.resultType).toBe('error')
    // each GraderError is a SyntaxError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'Syntax',
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
    // each GraderError is a RuntimeError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'Runtime',
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
    // each GraderError is a RuntimeError at the correct line
    result.errors.map(error => expect(error).toEqual({
      errorType: 'Syntax',
      line: 5,
      location: 'grader'
    }))
  })
})
