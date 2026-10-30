import { describe, expect, it } from 'vitest'
import {
  GUIDED_DIFFICULTIES,
  difficultyCopyKey,
  findGuidedLevel,
  guidedLevelsForDifficulty,
  levelCopyKey,
  listGuidedLevels,
  nextGuidedLevel,
  parseGameSearch,
} from '../circuitLevels'

const IDS = [
  'cb-01-closed-circuit',
  'cb-02-switch-control',
  'cb-03-series-loop',
  'cb-04-parallel-branches',
  'cb-05-series-vs-parallel',
  'cb-06-short-circuit-recovery',
  'cb-07-resistance-limits-current',
  'cb-08-variable-voltage',
]

describe('guided level catalog', () => {
  it('lists the eight guided levels in id order and excludes the sandbox', () => {
    expect(listGuidedLevels().map((l) => l.id)).toEqual(IDS)
  })

  it('has two levels per difficulty tier', () => {
    for (const d of GUIDED_DIFFICULTIES) {
      expect(guidedLevelsForDifficulty(d)).toHaveLength(2)
    }
    expect(guidedLevelsForDifficulty(5)).toEqual([])
  })

  it('maps difficulty to numeric disclosure', () => {
    const expected = ['none', 'qualitative', 'values', 'full']
    for (const level of listGuidedLevels()) {
      expect(level.numericDisclosure).toBe(expected[level.difficulty - 1])
    }
  })

  it('finds a guided level and refuses the sandbox and unknown ids', () => {
    expect(findGuidedLevel('cb-03-series-loop')?.difficulty).toBe(2)
    expect(findGuidedLevel('sandbox')).toBeNull()
    expect(findGuidedLevel('nope')).toBeNull()
  })

  it('walks the curriculum in order and ends with null', () => {
    expect(nextGuidedLevel('cb-01-closed-circuit')?.id).toBe('cb-02-switch-control')
    expect(nextGuidedLevel('cb-08-variable-voltage')).toBeNull()
    expect(nextGuidedLevel('sandbox')).toBeNull()
    expect(nextGuidedLevel('unknown')).toBeNull()
  })
})

describe('parseGameSearch', () => {
  it('accepts a matching difficulty and level, with or without the leading ?', () => {
    const a = parseGameSearch('?difficulty=2&level=cb-03-series-loop')
    const b = parseGameSearch('level=cb-03-series-loop&difficulty=2')
    expect(a?.difficulty).toBe(2)
    expect(a?.level.id).toBe('cb-03-series-loop')
    expect(b?.level.id).toBe('cb-03-series-loop')
  })

  it('rejects a difficulty that does not match the level', () => {
    expect(parseGameSearch('?difficulty=3&level=cb-03-series-loop')).toBeNull()
  })

  it('rejects non-integer and out-of-range difficulties', () => {
    for (const d of ['0', '5', '1.5', 'abc', '', '-1', '01', '2 ', '1e0']) {
      expect(parseGameSearch(`?difficulty=${encodeURIComponent(d)}&level=cb-01-closed-circuit`)).toBeNull()
    }
  })

  it('rejects unknown levels and the sandbox', () => {
    expect(parseGameSearch('?difficulty=4&level=sandbox')).toBeNull()
    expect(parseGameSearch('?difficulty=1&level=cb-99')).toBeNull()
  })

  it('rejects missing parameters and empty input', () => {
    expect(parseGameSearch('')).toBeNull()
    expect(parseGameSearch('?difficulty=1')).toBeNull()
    expect(parseGameSearch('?level=cb-01-closed-circuit')).toBeNull()
  })

  it('never throws on hostile input', () => {
    for (const s of ['%', '?difficulty=%E0%A4%A&level=%', '?__proto__=1&constructor=2', '\u0000']) {
      expect(() => parseGameSearch(s)).not.toThrow()
    }
    expect(parseGameSearch('?difficulty=1&level=__proto__')).toBeNull()
    expect(parseGameSearch('?difficulty=1&level=constructor')).toBeNull()
  })
})

describe('copy keys', () => {
  it('builds level and difficulty keys', () => {
    expect(levelCopyKey('cb-01-closed-circuit', 'goal')).toBe(
      'circuitBuilder.level.cb-01-closed-circuit.goal'
    )
    expect(difficultyCopyKey(3, 'summary')).toBe('circuitBuilder.difficulty.3.summary')
  })
})
