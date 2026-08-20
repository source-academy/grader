#!/usr/bin/env node
/**
 * End-to-end smoke test for conductor grading.
 *
 * Runs the *built* grader (`build/conductor.js`) against a real, published
 * Source Academy evaluator bundle (fetched from GitHub Pages), proving that a
 * conductor question can be graded headless in Node. Requires network access
 * and executes the downloaded evaluator bundle, so it is intentionally NOT part
 * of `yarn test` / CI.
 *
 * Usage: yarn build && node scripts/smoke-conductor.cjs
 */
const path = require('node:path')

const { runAllConductor } = require(path.join(__dirname, '..', 'build', 'conductor.js'))

const event = {
  library: { format: 'conductor', language: 'python3', evaluator: 'python3Default' },
  prependProgram: '',
  studentProgram: 'def double(n):\n    return n * 2\n',
  postpendProgram: '',
  testcases: [
    { program: 'print(double(21))', answer: '42', score: 1 }, // expect pass
    { program: 'print(double(5))', answer: '10', score: 2 }, // expect pass
    { program: 'print(double(1))', answer: '999', score: 3 }, // expect fail (2 != 999)
    { program: 'print(undefined_name)', answer: 'x', score: 4 }, // expect error
  ],
}

runAllConductor(event)
  .then(summary => {
    console.log(JSON.stringify(summary, null, 2))
    const [pass1, pass2, fail, error] = summary.results
    const ok =
      summary.maxScore === 10 &&
      summary.totalScore === 3 &&
      pass1.resultType === 'pass' &&
      pass2.resultType === 'pass' &&
      fail.resultType === 'fail' &&
      error.resultType === 'error'
    console.log(ok ? '\nSMOKE PASSED' : '\nSMOKE FAILED: unexpected results')
    process.exit(ok ? 0 : 1)
  })
  .catch(err => {
    console.error('SMOKE FAILED:', err)
    process.exit(1)
  })
