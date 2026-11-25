// The text of the value that an evaluator sends as the result of a program, which an answer is
// compared with. The same as the frontend's (`formatValue` in src/commons/utils): strings quoted,
// `null` and `undefined` spelled out, arrays as `[a, b]` (a missing slot as `undefined`), plain
// objects as `{key: value}`, a structure that contains itself cut off with `...<circular>`, and one
// nested deeper than MAX_DEPTH with `...<truncated>`. Deliberately simple and the same for every
// language: an evaluator that wants a value shown in its own notation sends it in that notation.
const MAX_DEPTH = 100

export function formatValue(value: unknown): string {
  return format(value, new Set())
}

function format(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value !== 'object') return String(value)
  if (ancestors.has(value)) return '...<circular>'
  if (ancestors.size >= MAX_DEPTH) return '...<truncated>'
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      return `[${Array.from(value, item => format(item, ancestors)).join(', ')}]`
    }
    if (Object.getPrototypeOf(value) === Object.prototype) {
      const entries = Object.entries(value).map(
        ([key, item]) => `${key}: ${format(item, ancestors)}`,
      )
      return `{${entries.join(', ')}}`
    }
    return String(value)
  } finally {
    ancestors.delete(value)
  }
}
