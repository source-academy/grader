// A script written for a browser worker: it uses only `self`, `postMessage` and `addEventListener`.
self.addEventListener('message', event => {
  self.postMessage({ echo: event.data, selfIsGlobal: self === globalThis })
})
