// A conductor evaluator that sends a lot, then finishes at once: its status update (ready again) can
// overtake the output, result and error that ride their own channels.
import { ConductorError } from '@sourceacademy/conductor/common'
import { BasicEvaluator, initialise } from '@sourceacademy/conductor/runner'

class Chatty extends BasicEvaluator {
  async evaluateChunk() {
    for (let i = 0; i < 300; i++) this.conductor.sendOutput(`line ${i}`)
    this.conductor.sendResult(42)
    this.conductor.sendError(new ConductorError('boom'))
  }
}

// the worker bootstrap gives `self`, which is the link the conductor uses by default
initialise(Chatty)
