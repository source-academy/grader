import { createContext, runInContext, Result as SourceResult } from 'js-slang'
import {
  defineSymbol,
  ensureGlobalEnvironmentExist,
  importBuiltins
} from 'js-slang/dist/createContext'
import type { SourceError } from 'js-slang/dist/errors/base'
import { Variant } from 'js-slang/dist/langs'
import { Context, Frame, Value } from 'js-slang/dist/types'
import { stringify } from 'js-slang/dist/utils/stringify'

import { loadCurves, loadRunes } from './graphicsLoader'
import { setupLambdaXvfb } from './setupXvfb'
import {
  AwsEvent,
  ErrorFromSource,
  ErrorFromTimeout,
  Library,
  Output,
  OutputError,
  OutputFail,
  OutputPass,
  Summary,
  Testcase
} from './types'

const externals: any = {}
Object.assign(externals, require('./tree.js'))

const TIMEOUT_DURATION = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT!, 10) : 3000 // in milliseconds

// A single unit test composed from an AwsEvent by runAll().
export type UnitTest = {
  library: Library
  prependProgram: string
  studentProgram: string
  postpendProgram: string
  testcase: Testcase
}

// The 'raw' result of the js-slang interpreter, before refinement into Output.
type Result = SourceResult | TimeoutResult

type TimeoutResult = {
  status: 'timeout'
}

// Grades a Source (js-slang) event and returns the Summary the backend expects.
export const runAll = async (event: AwsEvent): Promise<Summary> => {
  if (event.library && event.library.external) {
    switch (event.library.external.name) {
      case 'RUNES': {
        await setupLambdaXvfb()
        Object.assign(externals, await loadRunes())
        externals.getReadyWebGLForCanvas('3d')
        externals.getReadyStringifyForRunes(stringify)
        break
      }
      case 'CURVES': {
        await setupLambdaXvfb()
        Object.assign(externals, await loadCurves())
        externals.getReadyWebGLForCanvas('curve')
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

  const maxScore = event.testcases.reduce<number>(
    (max: number, testcase) => testcase.score + max,
    0
  )

  return {
    totalScore: totalScore,
    maxScore: maxScore,
    results: results
  }
}

// Runs one unit test composed by runAll().
export const run = async (unitTest: UnitTest): Promise<Output> => {
  const context = createContext(unitTest.library.chapter, Variant.DEFAULT, {})
  for (const name of unitTest.library.external.symbols) {
    defineSymbol(context, name, externals[name])
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

// Evaluates Library.globals pairs and binds them into the global frame.
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
        defineSymbol(context, name, value)
      }
    }
  }

  const result = await Promise.resolve(fn())

  context.chapter = originalChapter
  context.runtime.environments[0].head = originalFrame
  return [result, overrideFrame]
}

// Races js-slang's result against a timeout.
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
          case 'InfiniteLoopError':
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
        const errorLine = (lines[line - 1] ?? '(unknown)').trim()
        return {
          errorType: err.type.toLowerCase() as 'syntax' | 'runtime',
          line,
          location,
          errorLine,
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
