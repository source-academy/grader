// A host for conductor evaluators (https://github.com/source-academy/conductor): runs an evaluator's
// script in a worker thread, gives it one program as a file over the conductor protocol, and
// collects what it outputs and the errors it reports. It knows nothing of any language.
//
// An evaluator is stopped only by terminating its thread, so each program runs in a throwaway worker
// under a wall-clock watchdog.

import * as path from 'path'
import { Worker } from 'worker_threads'

export type EvaluatorProcess = {
  // Absolute path of the evaluator's script.
  script: string
  // The environment of the worker, on top of the grader's.
  env: Record<string, string>
  // URL -> absolute path of a file: what the evaluator fetches from such a URL comes from the file.
  files?: Record<string, string>
}

export type EvaluatorRun = {
  // What the program sent to the output (a line each), in order.
  outputs: string[]
  // The values the evaluator sent as the result of the program (the value of its last expression,
  // for a language that has one), as they arrived: plain data.
  results: unknown[]
  // The errors the evaluator reported, as their messages (the conductor sends nothing else).
  errors: string[]
  timedOut: boolean
  // The worker failed (the script is missing or throws): not the program's error.
  failure?: string
}

export type EvaluatorRunner = (
  evaluator: EvaluatorProcess,
  fileName: string,
  program: string,
  timeoutMs: number,
) => Promise<EvaluatorRun>

// The conductor is a package of ES modules, and this one is compiled to CommonJS: it is imported
// when the first program runs.
async function loadConductor() {
  const [conduit, host, types] = await Promise.all([
    import('@sourceacademy/conductor/conduit'),
    import('@sourceacademy/conductor/host'),
    import('@sourceacademy/conductor/types'),
  ])
  return {
    Conduit: conduit.Conduit,
    BasicHostPlugin: host.BasicHostPlugin,
    RunnerStatus: types.RunnerStatus,
  }
}

// The first script of the worker: it gives a Node worker the globals of a browser worker (`self`,
// `postMessage`, `addEventListener`, `fetch` from vendored files, `Worker`) and loads the evaluator's
// script as it is. See workerBootstrap.js.
export const WORKER_BOOTSTRAP = path.join(__dirname, 'workerBootstrap.js')

const MAX_HEAP_MB = process.env.EVALUATOR_MAX_HEAP_MB
  ? parseInt(process.env.EVALUATOR_MAX_HEAP_MB, 10)
  : 512

export const runInEvaluator: EvaluatorRunner = async (evaluator, fileName, program, timeoutMs) => {
  const { Conduit, BasicHostPlugin, RunnerStatus } = await loadConductor()

  return new Promise<EvaluatorRun>(resolve => {
    const outputs: string[] = []
    const results: unknown[] = []
    const errors: string[] = []
    const worker = new Worker(WORKER_BOOTSTRAP, {
      workerData: { script: evaluator.script, files: evaluator.files ?? {} },
      // Only what the manifest gives: the grader's own environment (credentials) is not for a program
      // that a student wrote, which can read it (OCaml's Sys.getenv does).
      env: { ...evaluator.env },
      resourceLimits: { maxOldGenerationSizeMb: MAX_HEAP_MB },
    })

    let settled = false
    const finish = (rest: Partial<EvaluatorRun>) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      void worker.terminate()
      resolve({ outputs, results, errors, timedOut: false, ...rest })
    }
    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs)
    worker.on('error', (error: Error) => finish({ failure: error?.message ?? String(error) }))
    worker.on('exit', code => finish({ failure: `The evaluator exited (code ${code})` }))

    // A Node worker has no addEventListener, and the conduit transfers message ports.
    const link = {
      postMessage: (message: unknown, transfer: never) => worker.postMessage(message, transfer),
      addEventListener: (_: string, listener: (event: { data: unknown }) => void) => {
        worker.on('message', data => listener({ data }))
      },
    }

    let ready = false
    let sent = 0
    let received = 0
    const done = () => {
      if (ready && received >= sent) finish({})
    }

    // (methods, not class fields: the base class binds requestFile in its constructor)
    class Host extends BasicHostPlugin {
      requestFile(name: string) {
        return Promise.resolve(name === fileName ? program : undefined)
      }
      async requestLoadPlugin() {}
      queryPluginResolutions() {
        return {}
      }
      receiveOutput(message: string) {
        outputs.push(message)
        received++
        done()
      }
      receiveResult(result: unknown) {
        results.push(result)
        received++
        done()
      }
      receiveError(error: { message: string }) {
        errors.push(error.message)
        received++
        done()
      }
      // The evaluator is ready again when it has run the file. Output, result and error ride their own
      // channels, which are not ordered against the status: the status says how many of them the
      // evaluator sent (`sentCount`), and the run is over when that many have arrived.
      receiveStatusUpdate(status: number, isActive: boolean, sentCount?: number) {
        if (status === RunnerStatus.EVAL_READY && isActive) {
          ready = true
          sent = sentCount ?? 0
          done()
        }
      }
    }
    const conduit = new Conduit(link as never, true)
    const host = conduit.registerPlugin(Host as never) as unknown as {
      startEvaluator(f: string): void
    }
    host.startEvaluator(fileName)
  })
}
