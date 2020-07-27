import { createContext, runInContext, Result as SourceResult } from 'js-slang'
import { stringify } from 'js-slang/dist/utils/stringify'
import { SourceError } from 'js-slang/dist/types'

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT!, 10) : 3000 // in milliseconds

/**
 * @property globals - an array of two element string arrays. The first element
 *   of this latter array is the identifier for the global var, and the second
 *   element is its javascript value (to be eval'd).
 */
export type Library = {
  chapter: number
  external: {
    name: 'NONE' | 'RUNES' | 'CURVES' | 'SOUNDS' | 'BINARYTREES' | 'PIXNFLIX'
    symbols: string[]
  }
  globals: Array<string[]>
}

export type Testcase = {
  program: string
  answer: string
  score: number
}

/**
 * Set of properties of an event from the backend
 */
export type AwsEvent = {
  library: Library
  prependProgram: string
  studentProgram: string
  postpendProgram: string
  testcases: Testcase[]
}

/**
 * Set of properties of a unit test
 */
export type UnitTest = {
  library: Library
  prependProgram: string
  studentProgram: string
  postpendProgram: string
  testcase: Testcase
}

/**
 * Summary is the JSON object the backend receives
 * @property totalScore - the total score of the student program
 * @property results - the array of Output types
 */
type Summary = {
  totalScore: number
  results: Output[]
}

/**
 * Output is the 'refined' version of a @type {Result}.
 *  OutputPass - program raises no errors
 *  OutputFail - program raises no errors but answer is wrong
 *  OutputError - program raises an error
 */
type Output = OutputPass | OutputFail | OutputError

type OutputPass = {
  resultType: 'pass'
  score: number
}

type OutputFail = {
  resultType: 'fail'
  expected: string
  actual: string
}

type OutputError = {
  resultType: 'error'
  errors: Array<ErrorFromSource | ErrorFromTimeout>
}

type ErrorFromSource = {
  errorType: 'runtime' | 'syntax'
  line: number
  location: string
  errorLine: string
  errorExplanation: string
}

type ErrorFromTimeout = {
  errorType: 'timeout'
}

/**
 * Result is the 'raw' result of the js-slang interpreter running a
 * student/grader program. It will be transformed into a more 'refined'
 * @type {Output} to be returned to a backend.
 */
type Result = SourceResult | TimeoutResult

type TimeoutResult = {
  status: 'timeout'
}

/**
 * Runs all the unit tests provided by the @param event
 * @param event the AwsEvent from the Backend
 */
export const runAll = async (event: AwsEvent): Promise<Summary> => {
  require('./util.js')
  require('./list.js')
  require('./tree.js')

  /* Disabled until we can test runes, curves, etc.
  if (event.library && event.library.external) {
    switch (event.library.external.name) {
      case 'TWO_DIM_RUNES': { }
      case 'THREE_DIM_RUNES': {
        require('./graphics/rune_library.js')
        break
      }
      case 'CURVES': {
        require('./graphics/curves_library.js')
        break
      }
      case 'STREAMS': {
        require('./streams/streams.js')
        break
      }
    }
  }
  */

  evaluateGlobals(event.library.globals)
  const promises: Promise<Output>[] = event.testcases.map((testcase: Testcase) =>
    run({
      library: event.library,
      prependProgram: event.prependProgram || '',
      studentProgram: event.studentProgram,
      postpendProgram: event.postpendProgram || '',
      testcase: testcase
    })
  )
  const results = await Promise.all(promises)
  const totalScore = results.reduce<number>(
    (total: number, result) => (result.resultType === 'pass' ? total + result.score : total),
    0
  )
  return {
    totalScore: totalScore,
    results: results
  }
}

/**
 * Runs individual unit tests
 * @param unitTest the individual unit tests composed from runAll()
 */
export const run = async (unitTest: UnitTest): Promise<Output> => {
  const context = createContext(
    unitTest.library.chapter,
    'default',
    unitTest.library.external.symbols
  )
  const program = [
    unitTest.prependProgram,
    unitTest.studentProgram,
    unitTest.postpendProgram,
    unitTest.testcase.program
  ].join('\n')
  const result = await catchTimeouts(
    runInContext(program, context, {
      executionMethod: 'native',
      originalMaxExecTime: TIMEOUT_DURATION
    })
  )
  if (result.status === 'finished') {
    const resultValue = stringify(result.value)
    return resultValue === unitTest.testcase.answer
      ? ({
          resultType: 'pass',
          score: unitTest.testcase.score
        } as OutputPass)
      : ({
          resultType: 'fail',
          expected: unitTest.testcase.answer,
          actual: resultValue
        } as OutputFail)
  } else if (result.status === 'error') {
    return parseError(
      context.errors,
      unitTest.prependProgram,
      unitTest.studentProgram,
      unitTest.postpendProgram,
      unitTest.testcase.program
    )
  } else {
    return {
      resultType: 'error',
      errors: [{ errorType: 'timeout' }]
    }
  }
}

/**
 * Given an array of pairs, where the first element is an identifier, and the
 * second is a string representation of a javascript value, evaluate the value
 * and bind it to the identifier, in the global frame. Used for Library.globals
 */
const evaluateGlobals = (nameValuePairs: Array<string[]>) => {
  nameValuePairs.map(nameValuePair => {
    const name = nameValuePair[0]
    const value = nameValuePair[1]
    global[name] = eval(value)
  })
}

/**
 * Takes in the promise that js-slang's runInContext returns. Races it against a
 * timeout. Returns a @type{SourceResult} if the former resolves first,
 * otherwise a @type{TimeoutResult}.
 */
const catchTimeouts = (slangPromise: Promise<Result>): Promise<Result> => {
  return Promise.race([slangPromise, timeout(TIMEOUT_DURATION)])
}

const timeout = (msDuration: number): Promise<TimeoutResult> =>
  new Promise(resolve => setTimeout(resolve, msDuration, { status: 'timeout' }))

/**
 * Transforms the given SourceErrors and student, grader programs into an output
 * of @type {OutputError}.
 * @param sourceErrors Non-empty array of SourceErrors.
 * @param preProg prepend program string
 * @param stdProg student program string
 * @param postProg postpend program string
 * @param testProg test case program string
 */
const parseError = (
  sourceErrors: Array<SourceError>,
  preProg: string,
  stdProg: string,
  postProg: string,
  testProg: string
): OutputError => {
  const preProgLines = getLines(preProg)
  const stdProgLines = getLines(stdProg)
  const postProgLines = getLines(postProg)
  const testProgLines = getLines(testProg)
  const errors = sourceErrors.map((err: SourceError) => {
    switch (err.constructor.name) {
      case 'PotentialInfiniteLoopError':
      case 'PotentialInfiniteRecursionError':
        return {
          errorType: 'timeout' as 'timeout'
        }
    }

    const line = err.location.end.line > 0 ? err.location.end.line : err.location.start.line
    if (line <= 0) {
      return {
        errorType: err.type.toLowerCase() as 'syntax' | 'runtime',
        line: 0,
        location: 'unknown',
        errorLine: '',
        errorExplanation: err.explain()
      }
    }

    const [location, locationLine] =
      line <= preProgLines.length
        ? ['prepend', line]
        : line <= preProgLines.length + stdProgLines.length
        ? ['student', line - preProgLines.length]
        : line <= preProgLines.length + stdProgLines.length + postProgLines.length
        ? ['postpend', line - preProgLines.length - stdProgLines.length]
        : ['testcase', line - preProgLines.length - stdProgLines.length - postProgLines.length]
    const errorLine =
      (location == 'prepend'
        ? preProgLines[locationLine - 1]
        : location == 'student'
        ? stdProgLines[locationLine - 1]
        : location == 'postpend'
        ? postProgLines[locationLine - 1]
        : testProgLines[locationLine - 1]) || ''
    return {
      errorType: err.type.toLowerCase() as 'syntax' | 'runtime',
      line: locationLine,
      location: location,
      errorLine: errorLine.trim(),
      errorExplanation: err.explain()
    }
  })
  return {
    resultType: 'error',
    errors: errors
  }
}

/**
 * Split a program string into an array of strings.
 */
const getLines = (str: string) => str.split('\n')
