// A script written for a browser worker, as an ES module with top-level await.
const waited = await Promise.resolve(true)
self.addEventListener('message', event => {
  self.postMessage({ echo: event.data, waited })
})
