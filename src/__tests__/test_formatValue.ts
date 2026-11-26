import { formatValue } from '../formatValue'

describe('formatValue', () => {
  it('shows values as the frontend does', () => {
    expect(formatValue(120)).toBe('120')
    expect(formatValue('a"b')).toBe('"a\\"b"')
    expect(formatValue(true)).toBe('true')
    expect(formatValue(null)).toBe('null')
    expect(formatValue(undefined)).toBe('undefined')
    expect(formatValue([1, [2, null]])).toBe('[1, [2, null]]')
    expect(formatValue({ a: 1, b: 'x' })).toBe('{a: 1, b: "x"}')
  })

  it('shows a missing slot of a sparse array as undefined', () => {
    expect(formatValue([1, , 3])).toBe('[1, undefined, 3]') // eslint-disable-line no-sparse-arrays
  })

  it('cuts off a structure that contains itself', () => {
    const a: unknown[] = [1]
    a.push(a)
    expect(formatValue(a)).toBe('[1, ...<circular>]')
  })

  it('cuts off a value nested deeper than 100, so that it cannot exhaust the stack', () => {
    let deep: unknown = 0
    for (let i = 0; i < 100000; i++) deep = [deep]
    expect(formatValue(deep)).toContain('...<truncated>')
  })
})
