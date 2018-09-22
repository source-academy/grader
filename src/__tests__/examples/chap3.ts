/** In this example, the student is asked to apply some imperative programming concepts.
 *
 * - The variable 'x' must be assigned to 1,
 *     and a function reassign_x must re-assign 'x' to 2.
 * - The array 'arr' must be empty ([]),
 *     and a function assign_array must assign index 0 to 'a' and index 1 to 'b'
 * - The object 'obj' must be empty ({}),
 *     and a function assign_object must assign key 'a' to 1 and key 'b' to 2
 */

import { Grader, Student } from './types'

const validStudentCorrect =
  `
   let x = 1;
   function reassign_x() {
       x = 2;
   }

   let arr = [];
   function assign_array() {
       arr[0] = 'a';
       arr[1] = 'b';
   }

   let obj = {};
   function assign_object() {
       obj['a'] = 1;
       obj['b'] = 2;
   }
  `

const validStudentWrong =
  `
   let x = 1;
   function reassign_x() {}

   let arr = [];
   function assign_array() {}

   let obj = {};
   function assign_object() {}
  `

const validStudentPartial =
  `
   let x = 0;
   // wrong function
   function reassign_x() {
       x = 'a';
   }

   let arr = [];
   // wrong function
   function assign_array() {
       arr[0] = 1;
       arr[1] = 'b';
   }

   let obj = {};
   function assign_object() {
       obj['a'] = 1;
       obj['b'] = 2;
   }
  `

const invalidStudentRuntime =
   `
   function f() {
       x = 'a';
   }
   f();
  `


const invalidStudentSyntax =
  `
   let x;
   function reassign_x() {}
  `
const invalidStudentTimeout =
  `while(true) {}`

export const student: Student = {
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: invalidStudentSyntax,
    timeout: invalidStudentTimeout
  },
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  }
}

const invalidGraderRuntime = [
  `function ek0chei0y1() {
    return nonexistent_function();
  }

  ek0chei0y1();`
]

const invalidGraderSyntax = [
  `function ek0chei0y1() {
    return 1;
  }

  ek0chei0y1()`
]

const validGrader = [
  `function ek0chei0y1() {
    const initial = (x === 1);
    reassign_x();
    const final = (x === 2);
    return (initial && final) ? 1 : 0;
  }

  ek0chei0y1();`,

  `function ek0chei0y1() {
    const initial = is_empty_list(arr);
    assign_array();
    const final = (arr[0] === 'a' && arr[1] === 'b');
    return (initial && final) ? 1 : 0;
  }

  ek0chei0y1();`,

  `function ek0chei0y1() {
    const initial = (obj.a === undefined && obj.b === undefined);
    assign_object();
    const final = (obj.a === 1 && obj.b === 2);
    return (initial && final) ? 1 : 0;
  }

  ek0chei0y1();`
]

export const grader: Grader = {
  invalid: {
    runtime: invalidGraderRuntime,
    syntax: invalidGraderSyntax
  },
  valid: validGrader
}
