======
Grader
======

.. image:: https://travis-ci.org/source-academy/grader.svg?branch=master
    :target: https://travis-ci.org/source-academy/grader
.. image:: https://coveralls.io/repos/github/source-academy/grader/badge.svg?branch=master
    :target: https://coveralls.io/github/source-academy/grader?branch=master


**The grader is still in development, API specficiations may change!**

The grader is a component of the `Cadet backend`_. The grader,

1. Receives a student program string, and an array of grader program strings
2. For each grader program,

    1. Concatenate the student program and grader program into a single combined program
    2. Evaluates the single combined program in the `js-slang`_ interpreter
    
3. Returns a ``GraderOutput[]`` containing the result of the evaluation

.. _Cadet backend: https://github.com/source-academy/cadet
.. _js-slang: https://github.com/source-academy/js-slang

Grader Program
==============

The grader programs are programs written in `the source language`_. In the Grader, the grader programs will be individually concatenated with the student program. This means that,

- Each grader program will have access to the global scope of the student program,
- and that there is no restrictions to how the grader program is written,
- **save that the grader program returns a number.** [1]_

.. _the source language: https://github.com/source-academy/slang

Example: ``pass``
-----------------

For example, the student program may look like,

.. code-block:: javascript

    const sum = (a, b) => a + b;
    const mul = (a, b) => a * b;
    const pow = (a, b) => b === 1 ? a : a * pow(a, b - 1);
    
and the grader program [2]_,

.. code-block:: javascript

    function uovaej1pheeVai7ohkoh() {
        const sum_marks = sum(111, 234) === 345 ? 1 : 0;
        const mul_marks = mul(11, 9) === 99 ? 1 : 0;
        const pow_marks = pow(2, 8) === 256 ? 2 : 0;
        return sum_marks + mul_marks + pow_marks;
    }
    
    uovaej1pheeVai7ohkoh();

The grader's corresponding output for this function is then,

.. code-block:: json

    {
      "resultType": "pass",
      "marks": 4
    }

Note that the `resultType` pass represents any successful evaluation, i.e. no errors raised. It is independent of the `marks` property. 

Example: ``error``
------------------

All ``SourceErrors`` are fatal, i.e. execution stopping. Therefore, it may be advantageous to isolate potentially failing ``graderPrograms``. In the above example, for example, you may want to test if the student has considered the case for ``b === 0``. You can then write a second grader program, like so,

.. code-block:: javascript

    function uovaej1pheeVai7ohkoh() {
        const pow_marks_edge = pow(2, 0) === 0 ? 1 : 0;
        return pow_marks_edge;
    }
    
    uovaej1pheeVai7ohkoh();

Of course, this is an infinite loop. The source interpreter raises a runtime error [3]_,

.. code-block:: json

    {
      "resultType":  "error",
      "errors": [
        {
          "errorType": "Runtime",
          "line": 1,
          "location": "student"
        }
      ]
    }

And the `Cadet backend`_ will automatically assign a score of zero for this grading. For the submission, the marks are summed up, and so the student receives a total of 4 out of 5 marks for their definitions of ``sum``, ``mul``, and ``pow`` in this example.

Assessment XML Files
====================

Every assessment is represented as an XML file. They have a single node ``PROBLEMS`` with many child nodes ``PROBLEM``. Within each ``PROBLEM`` node, you may create any number of ``GRADER`` nodes. The content of each ``GRADER`` node will be used in separate grading (api calls), **and their return values will be summed up to be the score** for that ``PROBLEM``.

For example, the above gradings may be represented like so,

.. code-block:: xml

    <PROBLEMS>
        <PROBLEM>
            <TEXT>
    Write the functions `sum`, `mul`, and `pow`.
            </TEXT>
            <SNIPPET>
                <TEMPLATE>
    const sum = (a, b) => 0;  // your answer here
    const mul = (a, b) => 0;  // your answer here
    const pow = (a, b) => 0;  // your answer here
    // Test
    display(sum(999, 1));
    </TEMPLATE>
                <SOLUTION>
    // [Marking Scheme]
    // 5 marks for correct solutions
    const sum = (a, b) => a + b;
    // Test
    display(sum(999, 1));
                </SOLUTION>
            </SNIPPET>
            <GRADER>
    function uovaej1pheeVai7ohkoh() {
        const sum_marks = sum(111, 234) === 345 ? 1 : 0;
        const mul_marks = mul(11, 9) === 99 ? 1 : 0;
        const pow_marks = pow(2, 8) === 256 ? 2 : 0;
        return sum_marks + mul_marks + pow_marks;
    }
    
    uovaej1pheeVai7ohkoh();
            </GRADER>
            <GRADER>
    function uovaej1pheeVai7ohkoh() {
        const pow_marks_edge = pow(2, 0) === 0 ? 1 : 0;
        return pow_marks_edge;
    }
    
    uovaej1pheeVai7ohkoh();
            </GRADER>
        </PROBLEM>
    </PROBLEMS>
    
The grader then receives a two-element array of strings, each corresponding to the content of one of the above ``GRADER`` nodes. The overall output of the grader is then (using the student program near the top of this document),

.. code-block:: json

    [
      {
        "resultType": "pass",
        "marks": 4
      },
      {
        "resultType": "pass",
        "marks": 0
      }
    ]

Recall that a ``resultType`` of ``"pass"`` only means that no SourceErrors were raised in the evaluation. The order of ``GraderOutput`` elements in the array are preserved according to the order of ``GRADER`` nodes in the assessment XML files.

Note that the ``SOLUTION`` node is not related to the Grader, but a node used by a previous iteration of the source academy.

.. [1] In fact, the grader program accepts any return value from the combined student and grader programs; but the `Cadet backend`_ expects only a number, to be entered into the database.
.. [2] While staff have the flexibility to design the grader program in whatever style they fancy, it is recommended to nest *everything* in a function to avoid problems with variable scoping. Thus, only one identifier is created. Name this function such that it avoids possible collisions with the identifiers that the student may create, e.g. with randomly generated alphanumeric strings.
.. [3] Only if the execution is fast enough to exceed the maximum stack before the service times out. Either way, no marks are awarded for the grading. Syntax errors, even in the grader program, will also result in a return ``mark`` of 0.
