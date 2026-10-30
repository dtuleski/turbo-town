// The automated proof of the single-construction property. A comment inside a React component
// would be an assertion with nothing checking it; this is the check.

import { describe, expect, it } from 'vitest'
import { lazyRefValue } from '../lazyRef'

describe('lazyRefValue', () => {
  it('runs the factory exactly once across 100 calls and always returns that instance', () => {
    let constructions = 0
    const create = (): { id: number } => {
      constructions += 1
      return { id: constructions }
    }
    const cell: { current: { id: number } | null } = { current: null }

    const first = lazyRefValue(cell, create)
    for (let index = 0; index < 99; index += 1) {
      expect(lazyRefValue(cell, create)).toBe(first)
    }

    expect(constructions).toBe(1)
    expect(first.id).toBe(1)
    expect(cell.current).toBe(first)
  })

  it('never calls the factory for a cell that already holds a value', () => {
    let called = false
    const existing = { id: 7 }
    const cell: { current: { id: number } | null } = { current: existing }

    expect(
      lazyRefValue(cell, () => {
        called = true
        return { id: 99 }
      })
    ).toBe(existing)
    expect(called).toBe(false)
  })

  it('caches a falsy-but-valid value instead of re-running the factory', () => {
    // `??=` not `||=`: 0, '' and false are real values and must be cached like any other.
    let zeroCalls = 0
    const zeroCell: { current: number | null } = { current: null }
    const zero = (): number => {
      zeroCalls += 1
      return 0
    }
    expect(lazyRefValue(zeroCell, zero)).toBe(0)
    expect(lazyRefValue(zeroCell, zero)).toBe(0)
    expect(zeroCalls).toBe(1)

    let emptyCalls = 0
    const emptyCell: { current: string | null } = { current: null }
    const empty = (): string => {
      emptyCalls += 1
      return ''
    }
    expect(lazyRefValue(emptyCell, empty)).toBe('')
    expect(lazyRefValue(emptyCell, empty)).toBe('')
    expect(emptyCalls).toBe(1)

    let falseCalls = 0
    const falseCell: { current: boolean | null } = { current: null }
    const never = (): boolean => {
      falseCalls += 1
      return false
    }
    expect(lazyRefValue(falseCell, never)).toBe(false)
    expect(lazyRefValue(falseCell, never)).toBe(false)
    expect(falseCalls).toBe(1)
  })
})
