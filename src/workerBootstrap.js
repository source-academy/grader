// The first script of a worker that runs a conductor evaluator (see conductorHost.ts), in a worker
// thread. The evaluators that a language directory lists are built for a browser worker: they use
// `self`, `postMessage`, `addEventListener`, `fetch` and `Worker`. This gives a Node worker those,
// over its `parentPort`, and then loads the evaluator's script as it is. It knows nothing of any
// language.
//
// workerData: { script }  the evaluator's script (an absolute path)
//             { files }   URL -> path of a file: `fetch` of such a URL is answered from the file, so
//                         that what an evaluator downloads is vendored (no network)
//             { nested, code }  this worker is the one that a browser `Worker` polyfill started, and
//                         runs `code` as a classic script
'use strict'

const { parentPort, workerData, Worker: NodeWorker } = require('worker_threads')
const fs = require('fs')
const vm = require('vm')
const { resolveObjectURL } = require('buffer')
const { fileURLToPath, pathToFileURL } = require('url')

const files = workerData.files || {}

globalThis.self = globalThis
globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer)
globalThis.addEventListener = (type, listener) => {
  if (type === 'message') parentPort.on('message', data => listener({ data }))
}
globalThis.removeEventListener = () => {}
// `self.onmessage = ...`, as a browser worker's script may set it
Object.defineProperty(globalThis, 'onmessage', {
  configurable: true,
  set: listener => {
    if (typeof listener === 'function') parentPort.on('message', data => listener({ data }))
  },
})

const networkFetch = globalThis.fetch
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input)
  const file = Object.prototype.hasOwnProperty.call(files, url) ? files[url] : undefined
  return file === undefined
    ? networkFetch(input, init)
    : fs.promises.readFile(file).then(content => new Response(content, { status: 200 }))
}

// A browser `Worker` over a Node worker thread: from a `blob:` URL (what an evaluator makes of a script
// it fetched) or a `file:` URL, running the script as a classic script with the same globals.
globalThis.Worker = class BrowserWorker {
  constructor(url) {
    this.onmessage = null
    this.onerror = null
    this._listeners = { message: [], error: [] }
    this._queue = []
    this._inner = undefined
    this._terminated = false
    const href = String(url)
    const code = href.startsWith('blob:')
      ? resolveObjectURL(href).text()
      : fs.promises.readFile(href.startsWith('file:') ? fileURLToPath(href) : href, 'utf8')
    Promise.resolve(code).then(
      source => {
        if (this._terminated) return
        this._inner = new NodeWorker(__filename, {
          workerData: { nested: true, code: source, files },
        })
        this._inner.on('message', data => this._emit('message', { data }))
        this._inner.on('error', error => this._emit('error', { error, message: error.message }))
        for (const [message, transfer] of this._queue) this._inner.postMessage(message, transfer)
        this._queue = []
      },
      error => this._emit('error', { error, message: error.message }),
    )
  }
  postMessage(message, transfer) {
    if (this._inner) this._inner.postMessage(message, transfer)
    else this._queue.push([message, transfer])
  }
  addEventListener(type, listener) {
    if (this._listeners[type]) this._listeners[type].push(listener)
  }
  removeEventListener(type, listener) {
    if (this._listeners[type])
      this._listeners[type] = this._listeners[type].filter(l => l !== listener)
  }
  terminate() {
    this._terminated = true
    if (this._inner) void this._inner.terminate()
  }
  _emit(type, event) {
    const handler = this['on' + type]
    if (typeof handler === 'function') handler(event)
    for (const listener of this._listeners[type]) listener(event)
  }
}

if (workerData.nested) {
  vm.runInThisContext(workerData.code, { filename: 'worker.js' })
} else {
  // import(), not require(): an evaluator may be an ES module, even one with top-level await.
  import(pathToFileURL(workerData.script).href).catch(error => {
    setImmediate(() => {
      throw error
    })
  })
}
