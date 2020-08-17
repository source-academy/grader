import { createContext, runInContext, Result as SourceResult } from 'js-slang'
import { stringify } from 'js-slang/dist/utils/stringify'
import { SourceError, Context, Frame, Value } from 'js-slang/dist/types'
import {
  defineBuiltin,
  ensureGlobalEnvironmentExist,
  importBuiltins
} from 'js-slang/dist/createContext'
import { ChildProcess } from 'child_process'
import { setupXvfb } from './setupXvfb'

const externals = {}
Object.assign(externals, require('./tree.js'))

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
  location: 'prepend' | 'student' | 'postpend' | 'testcase' | 'unknown'
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
  let xvfb: ChildProcess | null = null
  if (event.library && event.library.external) {
    switch (event.library.external.name) {
      case 'RUNES': {
        xvfb = await setupXvfb()
        Object.assign(externals, require('./graphics/webGLrune.js'))
        break
      }
    }
  }

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

  if (xvfb) {
    xvfb.kill(9)
  }

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
  const context = createContext(unitTest.library.chapter, 'default', [])
  for (const name of unitTest.library.external.symbols) {
    defineBuiltin(context, name, externals[name])
  }

  // Run prepend
  const [prependResult, elevatedBase] = await runInElevatedContext(context, () =>
    catchTimeouts(
      runInContext(unitTest.prependProgram, context, {
        executionMethod: 'native',
        originalMaxExecTime: TIMEOUT_DURATION
      })
    )
  )
  if (prependResult.status !== 'finished') {
    return handleResult(prependResult, context, unitTest.prependProgram, 'prepend')
  }

  // Run student program
  const studentResult = await catchTimeouts(
    runInContext(unitTest.studentProgram, context, {
      executionMethod: 'native',
      originalMaxExecTime: TIMEOUT_DURATION
    })
  )
  if (studentResult.status !== 'finished') {
    return handleResult(studentResult, context, unitTest.studentProgram, 'student')
  }

  // Run postpend
  const [postpendResult] = await runInElevatedContext(
    context,
    () =>
      catchTimeouts(
        runInContext(unitTest.postpendProgram, context, {
          executionMethod: 'native',
          originalMaxExecTime: TIMEOUT_DURATION
        })
      ),
    elevatedBase
  )
  if (postpendResult.status !== 'finished') {
    return handleResult(postpendResult, context, unitTest.postpendProgram, 'postpend')
  }

  const [testcaseResult] = await runInElevatedContext(
    context,
    () =>
      catchTimeouts(
        runInContext(unitTest.testcase.program, context, {
          executionMethod: 'native',
          originalMaxExecTime: TIMEOUT_DURATION
        })
      ),
    elevatedBase
  )
  if (testcaseResult.status !== 'finished') {
    return handleResult(testcaseResult, context, unitTest.testcase.program, 'testcase')
  }

  const resultValue = stringify(testcaseResult.value)
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
}

/**
 * Given an array of pairs, where the first element is an identifier, and the
 * second is a string representation of a javascript value, evaluate the value
 * and bind it to the identifier, in the global frame. Used for Library.globals
 */
const evaluateGlobals = (nameValuePairs: Array<string[]>) => {
  for (const [name, value] of nameValuePairs) {
    ;(() => {
      externals[name] = eval(value)
    })()
  }
}

const slangDisplay = (value: Value, str: string) => {
  console.log((str === undefined ? '' : str + ' ') + value.toString())
  return value
}

async function runInElevatedContext<T>(
  context: Context,
  fn: () => Promise<T>,
  base?: any
): Promise<[T, Frame]>
async function runInElevatedContext<T>(
  context: Context,
  fn: () => T,
  base?: any
): Promise<[T, Frame]> {
  ensureGlobalEnvironmentExist(context)
  const originalChapter = context.chapter
  const originalFrame = context.runtime.environments[0].head

  const overrideFrame = base || Object.create(originalFrame)

  context.chapter = 4
  context.runtime.environments[0].head = overrideFrame

  if (!base) {
    importBuiltins(context, {
      rawDisplay: slangDisplay,
      prompt: slangDisplay,
      alert: slangDisplay,
      visualiseList: (v: Value) => {
        throw new Error('List visualizer is not enabled')
      }
    })
    for (const [name, value] of Object.entries(externals)) {
      if (!Object.prototype.hasOwnProperty.call(overrideFrame, name)) {
        defineBuiltin(context, name, value)
      }
    }
  }

  const result = await Promise.resolve(fn())

  context.chapter = originalChapter
  context.runtime.environments[0].head = originalFrame
  return [result, overrideFrame]
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

const handleResult = (
  result: Result,
  context: Context,
  program: string,
  location: ErrorFromSource['location']
): OutputError => {
  switch (result.status) {
    case 'error': {
      const errors = context.errors.map((err: SourceError): ErrorFromSource | ErrorFromTimeout => {
        switch (err.constructor.name) {
          case 'PotentialInfiniteLoopError':
          case 'PotentialInfiniteRecursionError':
            return {
              errorType: 'timeout' as const
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

        const lines = program.split('\n')
        return {
          errorType: err.type.toLowerCase() as 'syntax' | 'runtime',
          line,
          location,
          errorLine: lines[line - 1].trim(),
          errorExplanation: err.explain()
        }
      })
      return {
        resultType: 'error',
        errors: errors
      }
    }

    case 'timeout':
      return {
        resultType: 'error',
        errors: [{ errorType: 'timeout' }]
      }

    default:
      return {
        resultType: 'error',
        errors: [
          {
            errorType: 'runtime',
            line: 0,
            location: 'unknown',
            errorLine: '',
            errorExplanation: `Unexpected result status ${result.status}`
          }
        ]
      }
  }
}
