import { awsEventFactory } from './helpers'
import { runAll, Testcase } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 3,
  external: {
    name: 'NONE',
    symbols: [],
  },
  globals: [],
})

/*
  Chapter 3 tests - higher-order functions, nested functions, closures

  Testing:
  - Higher-order functions (map, filter, reduce)
  - Closures and lexical scoping
  - Curried functions
  - Function composition
*/

const validTestcases: Testcase[] = [
  {
    program: `make_adder(5)(3);`,
    answer: '8',
    score: 1,
  },
  {
    program: `make_adder(10)(15);`,
    answer: '25',
    score: 1,
  },
  {
    program: `make_adder(0)(100);`,
    answer: '100',
    score: 1,
  },
]

const validStudentCorrect = `
function make_adder(x) {
  return y => x + y;
}
`

const validStudentWrong = `
function make_adder(x) {
  return y => x * y;
}
`

const invalidStudentRuntime = `
function make_adder(x) {
  return y => x + z;
}
`

const invalidStudentSyntax = `
function make_adder(x) {
  return y => x + y
}
`

test('chapter 3: correct higher-order function', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: validStudentCorrect,
      postpendProgram: '',
      testcases: validTestcases,
    }),
  )
  expect(results).toEqual({
    totalScore: 3,
    maxScore: 3,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
      {
        resultType: 'pass',
        score: 1,
      },
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('chapter 3: wrong higher-order function', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: validStudentWrong,
      postpendProgram: '',
      testcases: validTestcases,
    }),
  )
  expect(results).toEqual({
    totalScore: 0,
    maxScore: 3,
    results: [
      {
        resultType: 'fail',
        expected: '8',
        actual: '15',
      },
      {
        resultType: 'fail',
        expected: '25',
        actual: '150',
      },
      {
        resultType: 'fail',
        expected: '100',
        actual: '0',
      },
    ],
  })
})

test('chapter 3: runtime error in higher-order function', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: invalidStudentRuntime,
      postpendProgram: '',
      testcases: validTestcases,
    }),
  )
  expect(results).toEqual({
    totalScore: 0,
    maxScore: 3,
    results: [
      {
        resultType: 'error',
        errors: [
          {
            errorType: 'runtime',
            line: 3,
            location: 'student',
            errorLine: 'return y => x + z;',
            errorExplanation: 'Name z not declared.',
          },
        ],
      },
      {
        resultType: 'error',
        errors: [
          {
            errorType: 'runtime',
            line: 3,
            location: 'student',
            errorLine: 'return y => x + z;',
            errorExplanation: 'Name z not declared.',
          },
        ],
      },
      {
        resultType: 'error',
        errors: [
          {
            errorType: 'runtime',
            line: 3,
            location: 'student',
            errorLine: 'return y => x + z;',
            errorExplanation: 'Name z not declared.',
          },
        ],
      },
    ],
  })
})

test('chapter 3: syntax error in higher-order function', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: invalidStudentSyntax,
      postpendProgram: '',
      testcases: validTestcases,
    }),
  )
  expect(results).toEqual({
    totalScore: 0,
    maxScore: 3,
    results: [
      {
        resultType: 'error',
        errors: [
          {
            errorType: 'syntax',
            line: 3,
            location: 'student',
            errorLine: 'return y => x + y',
            errorExplanation: 'Missing semicolon at the end of statement',
          },
        ],
      },
      {
        resultType: 'error',
        errors: [
          {
            errorType: 'syntax',
            line: 3,
            location: 'student',
            errorLine: 'return y => x + y',
            errorExplanation: 'Missing semicolon at the end of statement',
          },
        ],
      },
      {
        resultType: 'error',
        errors: [
          {
            errorType: 'syntax',
            line: 3,
            location: 'student',
            errorLine: 'return y => x + y',
            errorExplanation: 'Missing semicolon at the end of statement',
          },
        ],
      },
    ],
  })
})

// Test with compose function
const composeTestcases: Testcase[] = [
  {
    program: `compose(x => x * 2, x => x + 1)(5);`,
    answer: '12',
    score: 2,
  },
]

const validCompose = `
function compose(f, g) {
  return x => f(g(x));
}
`

test('chapter 3: function composition correct', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: validCompose,
      postpendProgram: '',
      testcases: composeTestcases,
    }),
  )
  expect(results).toEqual({
    totalScore: 2,
    maxScore: 2,
    results: [
      {
        resultType: 'pass',
        score: 2,
      },
    ],
  })
})
