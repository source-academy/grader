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
   function reassign_x() {
       x = 2;
   }

   function assign_array() {
       arr[0] = 'a';
       arr[1] = 'b';
   }

   function assign_object() {
       obj['a'] = 1;
       obj['b'] = 2;
   }
  `

const validStudentWrong =
  `
   function reassign_x() {}

   function assign_array() {}

   function assign_object() {}
  `

const validStudentPartial =
  `
   // wrong function
   function reassign_x() {
       x = 'a';
   }

   // wrong function
   function assign_array() {
       arr[0] = 1;
       arr[1] = 'b';
   }

   function assign_object() {
       obj['a'] = 1;
       obj['b'] = 2;
   }
  `

const invalidStudentRuntime =
  `
  function reassign_x() {
      y = 'a';
  }

  function assign_array() {
    arr[0] = 'a';
    arr[1] = 'b';
  }

  function assign_object() {
    obj['a'] = 1;
    obj['b'] = 2;
  }
  `

const invalidStudentSyntax =
  `
  function reassign_x() { g }

  function assign_array() {
    arr[0] = 'a';
    arr[1] = 'b';
  }

  function assign_object() {
    obj['a'] = 1;
    obj['b'] = 2;
  }
  `
const invalidStudentTimeout =
  `while(true) {}`

export const student: Student = {
  valid: {
    correct: validStudentCorrect,
    wrong: validStudentWrong,
    partial: validStudentPartial
  },
  invalid: {
    runtime: invalidStudentRuntime,
    syntax: invalidStudentSyntax,
    timeout: invalidStudentTimeout
  }
}

const validPrepend = `
  let x = 1;
  let arr = [];
  let obj = {};`

const invalidPrependSyntax = `
  let x = 1;
  let arr = []
  let obj = {};`

const invalidPrependRuntime = `
  let x = 1;
  let arr = list1();
  let obj = {};`

const invalidPostpendRuntime = `a();`

const invalidPostpendSyntax = `a()`

const validPostpend = `
  function check_x(x, y) {
    return x === y;
  }
  
  function check_arr(f, arr) {
    return f(arr);
  }
  
  function check_obj(f, obj) {
    return f(obj);
  }`

const invalidTestcaseRuntime = [
  {
    program: `check();`,
    answer: "true",
    score: 1
  }
]

const invalidTestcaseSyntax = [
  {
    program: `check_x(x, 1)`,
    answer: "true",
    score: 1
  },
]

const validTestcases = [
  {
    program:
      `const a1 = check_x(x, 1);
    reassign_x();
    const a2 = check_x(x, 2);
    
    a1 === a2;`,
    answer: "true",
    score: 1
  },
  {
    program:
      `const a1 = check_arr(is_empty_list, arr);
    assign_array();
    const f = (arr) => arr[0] === 'a' && arr[1] === 'b';
    const a2 = check_arr(f, arr);
    
    a1 === a2;`,
    answer: "true",
    score: 1
  },
  {
    program:
      `const f = (obj) => obj.a === undefined && obj.b === undefined;
    const a1 = check_obj(f, obj);
    assign_object();
    const g = (obj) => obj.a === 1 && obj.b === 2;
    const a2 = check_obj(g, obj);
    
    a1 === a2;`,
    answer: "true",
    score: 1
  }
]

export const grader: Grader = {
  validPrepend: validPrepend,
  invalidPrepend: {
    runtime: invalidPrependRuntime,
    syntax: invalidPrependSyntax,
    timeout: `while(true) {}`
  },
  validPostpend: validPostpend,
  invalidPostpend: {
    runtime: invalidPostpendRuntime,
    syntax: invalidPostpendSyntax,
    timeout: `while(true) {}`
  },
  validTestcases: validTestcases,
  invalidTestcases: {
    runtime: invalidTestcaseRuntime,
    syntax: invalidTestcaseSyntax
  }
}
