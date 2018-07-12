import { myHandler, numLines, parseError } from '../index'
import { TypeError } from 'js-slang/dist/utils/rttc'

const validStudent =
  `const sum = (a, b) => a + b;
   const mul = (a, b) => a * b;`
const validGrader =
  `(function() {
     const sum_marks = sum(1, 9) === 10 ? 2 : 0;
     const mul_marks = mul(9, 9) === 81 ? 3 : 0;
     return sum_marks + mul_marks;
   })()`
const invalidStudentSyntax =
  `const sum = (a, b) => a + b;
   const mul = (a, b) => a * b  // missing semicolon`
const invalidGraderSyntax =
  `(function() {
     const sum_marks = sum(1, 9) === 10 ? 2 : 0;
     const mul_marks = mul(9, 9) === 81 ? 3 : 0;
     return sum_marks + mul_marks  // missing semicolon
   })()`
const invalidStudentRuntime =
  `const sum = (a, b) => add(a, b);  // undefined variable
   const mul = (a, b) => a * b;`
const invalidGraderRuntime =
  `(function() {
     const add_marks = add(1, 9) === 10 ? 2 : 0;  // undefined variable
     const mul_marks = mul(9, 9) === 81 ? 3 : 0;
     return add_marks + mul_marks;
   })()`

describe('Test function numLines', () => {
  test('Test case 1', () => {
    expect(numLines(validStudent)).toBe(2)
  })
  test('Test case 2', () => {
    expect(numLines(validGrader)).toBe(5)
  })
})
