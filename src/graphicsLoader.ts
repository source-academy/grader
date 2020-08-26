import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

/* FIXME FIXME FIXME
 *
 * This is done so we can share the webGLgraphics.js between webGLcurve.js and webGLrune.js
 *
 * ... because these libraries are written to be included as <script> tags,
 * which obviously doesn't adapt well to a NodeJS environment.
 */

async function loadGraphicsLibrary(...filenames: string[]) {
  const libraries = await Promise.all(
    ['webGLgraphics.js', ...filenames].map(filename =>
      promisify(fs.readFile)(path.join(__dirname, 'graphics', filename), 'utf8')
    )
  )

  const libFn = new Function('module', 'exports', 'require', libraries.join('\n\n'))
  const module = {
    exports: {}
  }
  libFn(module, module.exports, require)
  return module.exports as any
}

export function loadRunes() {
  return loadGraphicsLibrary('webGLrune.js')
}

export function loadCurves() {
  return loadGraphicsLibrary('webGLhi_graph_ce.js', 'webGLcurve.js')
}
