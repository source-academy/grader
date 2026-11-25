# Source Academy Autograder Component

[![Build_status](https://travis-ci.org/source-academy/grader.svg?branch=master)](https://travis-ci.org/source-academy/grader)
[![Coverage](https://coveralls.io/repos/github/source-academy/grader/badge.svg?branch=master)](https://coveralls.io/github/source-academy/grader?branch=master)

The grader is a component of the [Cadet backend](https://github.com/source-academy/cadet). It knows no language. The grader,

1. Receives a JSON event from the backend, which names the [conductor](https://github.com/source-academy/conductor) evaluator that grades the question (`library.evaluator`, an id in the [language directory](https://github.com/source-academy/language-directory)),
2. For each testcase, concatenates the prepend, student, postpend and testcase programs into one program, and runs it in that evaluator, in a worker thread,
3. Returns a `Summary` JSON with the result of each testcase.

The evaluators (Source, Python, OCaml, ...) are vendored in `vendor/evaluators`, so that grading does not depend on the network: see [Conductor evaluators](#conductor-evaluators-any-language).

## Input JSON format

```json
{
  "library": { "language": "python4", "evaluator": "python4Py2js" },
  "prependProgram": "# This line is part of every testcase's program",
  "studentProgram": "def f(i):\n    return 0 if i == 0 else 1 if i < 3 else f(i - 1) + f(i - 2)",
  "postpendProgram": "",
  "testcases": [
    { "program": "print(f(1))", "answer": "1", "score": 1 },
    { "program": "print(f(3))", "answer": "2", "score": 1 },
    { "program": "print(f(5))", "answer": "5", "score": 1 }
  ]
}
```

`library.evaluator` must be an evaluator in `vendor/evaluators/manifest.json`; the grader refuses an event whose evaluator it does not have. (The backend's event has more fields, such as `chapter`, `runtime` and `userLibrary`; the grader does not read them.)

Each testcase's program is the prepend, student, postpend and testcase programs joined by newlines. A testcase's `answer` is compared with the last line that the program prints, or, for an evaluator whose manifest entry says `"answerFrom": "result"` (Source), with the value of the program's last expression, shown as in the frontend (`src/formatValue.ts`).

## Output `Summary` Format

The grader produces a `Summary` for every event, with one result per testcase: `pass`, `fail` (with the expected and the actual answer) or `error`.

```json
{
  "totalScore": 1,
  "maxScore": 3,
  "results": [
    { "resultType": "pass", "score": 1 },
    { "resultType": "fail", "expected": "2", "actual": "3" },
    {
      "resultType": "error",
      "errors": [
        {
          "errorType": "runtime",
          "line": 0,
          "location": "unknown",
          "errorLine": "",
          "errorExplanation": "integer division or modulo by zero"
        }
      ]
    }
  ]
}
```

An error is the message that the evaluator reported: the conductor sends nothing else, so every error is `runtime`, at no line. A program that runs out of time (`TIMEOUT`, and the evaluator's startup allowance) is `{ "errorType": "timeout" }`.

## Conductor evaluators (any language)

Every event names the evaluator that grades it, by `library.evaluator`: `src/conductorGrader.ts` runs each testcase's program in a worker thread under a [conductor](https://github.com/source-academy/conductor) host (`src/conductorHost.ts`), and compares the answer with what the program printed or returned (the manifest entry's `answerFrom`). The vendored evaluators are Source (`source1Default` to `source4Default`, from [js-slang](https://github.com/source-academy/js-slang)), Python (below) and OCaml (`ocamlJsOfOCaml`, from [ocaml-slang](https://github.com/source-academy/ocaml-slang)). The grader no longer grades Source's graphics modules (Runes, Curves): that needs headless versions of the modules (source-academy/modules#1011), and until then those questions are graded by hand.

One limit is the evaluator's, not the grader's: js-slang's Source evaluators stop a program after about one second (js-slang's own `originalMaxExecTime`, which a host cannot set) and report "Potential infinite loop detected" or "... recursion detected", whatever `TIMEOUT` is, so a finite Source program that takes longer than that (`fib(32)`, about 1.2 s) is an error; the old Source grader allowed it `TIMEOUT` (3 s).

Python is graded by [py-slang](https://github.com/source-academy/py-slang)'s evaluators (`python1Py2js` to `python4Py2js`, and `python4TypedPy2js`, which type-checks each program with its pyright-based checker before running it: a program with type errors is not run and scores nothing). The Typed evaluator downloads its checker; the manifest's `files` serves that URL from the vendored `TypedPy4Checker.js`, and the host gives the evaluator's worker a browser `Worker` for it (`src/workerBootstrap.js`).

The evaluators are vendored, so that grading does not depend on the network. To add or update one:

```sh
scripts/vendor-evaluator.sh ocaml https://source-academy.github.io/ocaml-slang OCamlEvaluator.js ocaml-toplevel.js
scripts/vendor-evaluator.sh python https://source-academy.github.io/py-slang Py2JsEvaluator4.js TypedPy2JsEvaluator4.js TypedPy4Checker.js
scripts/vendor-evaluator.sh source https://source-academy.github.io/js-slang SourceEvaluator3.js
```

then add its entry to the manifest (`script`, `fileName`, `env`, `fileEnv` for the files it loads, `files` for the URLs it downloads, `startupAllowanceMs` for an evaluator that needs longer than the default to start, and `studentSourceBinding` for a line that binds the student's source, and `answerFrom` for what the answer is compared with: `output`, the default, or `result`). `TIMEOUT` (ms per testcase), `EVALUATOR_STARTUP_ALLOWANCE` (extra ms for every testcase, which starts a fresh worker that loads the evaluator) and `EVALUATOR_MAX_HEAP_MB` set the limits.
