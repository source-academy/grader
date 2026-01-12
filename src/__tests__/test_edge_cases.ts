import { awsEventFactory } from './helpers'
import { runAll } from '../index'

const makeAwsEvent = awsEventFactory({
  chapter: 1,
  external: {
    name: 'NONE',
    symbols: [],
  },
  globals: [],
})

/*
  Edge case tests

  Testing:
  - Empty programs
  - Comments only
  - Multiple errors
  - Globals functionality
  - Large score values
  - Zero score testcases
  - String outputs
  - Boolean outputs
*/

test('empty student program with testcase that defines function', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: '',
      postpendProgram: '',
      testcases: [
        {
          program: `const f = x => x * 2; f(5);`,
          answer: '10',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('comments only in student program', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: '// This is a comment\n// Another comment',
      postpendProgram: '',
      testcases: [
        {
          program: `1 + 1;`,
          answer: '2',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('testcase with zero score', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const x = 5;',
      postpendProgram: '',
      testcases: [
        {
          program: `x;`,
          answer: '5',
          score: 0,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 0,
    maxScore: 0,
    results: [
      {
        resultType: 'pass',
        score: 0,
      },
    ],
  })
})

test('testcase with large score', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const x = 100;',
      postpendProgram: '',
      testcases: [
        {
          program: `x;`,
          answer: '100',
          score: 1000,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1000,
    maxScore: 1000,
    results: [
      {
        resultType: 'pass',
        score: 1000,
      },
    ],
  })
})

test('string output comparison', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const greeting = name => "Hello, " + name + "!";',
      postpendProgram: '',
      testcases: [
        {
          program: `greeting("World");`,
          answer: '"Hello, World!"',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('boolean output comparison', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const is_even = x => x % 2 === 0;',
      postpendProgram: '',
      testcases: [
        {
          program: `is_even(4);`,
          answer: 'true',
          score: 1,
        },
        {
          program: `is_even(3);`,
          answer: 'false',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 2,
    maxScore: 2,
    results: [
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

test('undefined output', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const do_nothing = x => undefined;',
      postpendProgram: '',
      testcases: [
        {
          program: `do_nothing(5);`,
          answer: 'undefined',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

// null output test removed - null is not allowed in chapter 1

test('prepend defines helper, student uses it', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: 'const helper = x => x * x;',
      studentProgram: 'const square_plus_one = x => helper(x) + 1;',
      postpendProgram: '',
      testcases: [
        {
          program: `square_plus_one(5);`,
          answer: '26',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('postpend validates student output', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const get_value = () => 42;',
      postpendProgram: 'const result = get_value(); const check = result === 42;',
      testcases: [
        {
          program: `check;`,
          answer: 'true',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('multiple testcases with mixed results', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const buggy = x => x < 5 ? x * 2 : x + 1;',
      postpendProgram: '',
      testcases: [
        {
          program: `buggy(3);`,
          answer: '6',
          score: 1,
        },
        {
          program: `buggy(5);`,
          answer: '10',
          score: 1,
        },
        {
          program: `buggy(10);`,
          answer: '20',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 3,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
      {
        resultType: 'fail',
        expected: '10',
        actual: '6',
      },
      {
        resultType: 'fail',
        expected: '20',
        actual: '11',
      },
    ],
  })
})

// Test with globals
const makeAwsEventWithGlobals = awsEventFactory({
  chapter: 1,
  external: {
    name: 'NONE',
    symbols: [],
  },
  globals: [
    ['PI', '3.14159'],
    ['E', '2.71828'],
  ],
})

test('globals are available to student program', async () => {
  const results = await runAll(
    makeAwsEventWithGlobals({
      prependProgram: '',
      studentProgram: 'const use_pi = () => PI;',
      postpendProgram: '',
      testcases: [
        {
          program: `use_pi();`,
          answer: '3.14159',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})

test('negative numbers', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const negate = x => -x;',
      postpendProgram: '',
      testcases: [
        {
          program: `negate(5);`,
          answer: '-5',
          score: 1,
        },
        {
          program: `negate(-3);`,
          answer: '3',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 2,
    maxScore: 2,
    results: [
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

test('floating point numbers', async () => {
  const results = await runAll(
    makeAwsEvent({
      prependProgram: '',
      studentProgram: 'const divide = (a, b) => a / b;',
      postpendProgram: '',
      testcases: [
        {
          program: `divide(10, 4);`,
          answer: '2.5',
          score: 1,
        },
      ],
    }),
  )
  expect(results).toEqual({
    totalScore: 1,
    maxScore: 1,
    results: [
      {
        resultType: 'pass',
        score: 1,
      },
    ],
  })
})
