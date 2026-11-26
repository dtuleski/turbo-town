import { describe, expect, it } from 'vitest'
import en from '../en.json'
import es from '../es.json'
import pt from '../pt.json'
import { CHALLENGE_ROTATION } from '@/utils/challengeShared'

/**
 * Daily Challenge locale gate (DC4). i18n falls back to English silently, so this keeps the challenge
 * block of es and pt in step with en, checks that every rotation game has a name, and pins the
 * renamed toggle texts (W8).
 */
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
interface JsonObject {
  [key: string]: JsonValue
}

const flatten = (value: JsonObject, prefix = ''): Map<string, JsonValue> => {
  const leaves = new Map<string, JsonValue>()
  for (const [key, child] of Object.entries(value)) {
    const path = `${prefix}${key}`
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      for (const [nested, leaf] of flatten(child as JsonObject, `${path}.`)) leaves.set(nested, leaf)
    } else {
      leaves.set(path, child)
    }
  }
  return leaves
}

const blockOf = (locale: unknown, name: string): JsonObject => {
  const block = (locale as JsonObject)[name]
  if (block === null || typeof block !== 'object' || Array.isArray(block)) {
    throw new Error(`locale has no ${name} block`)
  }
  return block as JsonObject
}

const EN = flatten(blockOf(en, 'challenge'))
const TRANSLATIONS = [
  ['es', flatten(blockOf(es, 'challenge'))],
  ['pt', flatten(blockOf(pt, 'challenge'))],
] as const

/** Names that are the same word in every locale. */
const IDENTICAL_ALLOWED: ReadonlySet<string> = new Set(['games.sudoku', 'games.scratch-coding', 'games.bond-and-burn'])

const placeholders = (value: JsonValue | undefined): string[] =>
  typeof value === 'string' ? [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort() : []

describe('challenge locale completeness', () => {
  it('en declares a non-empty challenge block', () => {
    expect(EN.size).toBeGreaterThan(0)
  })

  for (const [name, translation] of TRANSLATIONS) {
    describe(name, () => {
      it('has nothing missing from en', () => {
        expect([...EN.keys()].filter((key) => !translation.has(key))).toEqual([])
      })
      it('has nothing extra', () => {
        expect([...translation.keys()].filter((key) => !EN.has(key))).toEqual([])
      })
      it('has a non-empty string for every key', () => {
        const bad = [...translation.entries()]
          .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
          .map(([key]) => key)
        expect(bad).toEqual([])
      })
      it('keeps the same {{placeholders}} as en', () => {
        const drift = [...EN.entries()]
          .filter(([key, value]) => placeholders(value).join() !== placeholders(translation.get(key)).join())
          .map(([key]) => key)
        expect(drift).toEqual([])
      })
      it('leaves no value byte-identical to en outside the allow-list', () => {
        const copied = [...EN.entries()]
          .filter(([key, value]) => !IDENTICAL_ALLOWED.has(key) && translation.get(key) === value)
          .map(([key]) => key)
        expect(copied).toEqual([])
      })
    })
  }

  it('names every game of the rotation', () => {
    const missing = CHALLENGE_ROTATION.map((e) => e.gameId).filter((id) => !EN.has(`games.${id}`))
    expect(missing).toEqual([])
  })

  it('card.best and results.me carry score and rank', () => {
    expect(placeholders(EN.get('card.best'))).toEqual(['rank', 'score'])
    expect(placeholders(EN.get('results.me'))).toEqual(['rank', 'score'])
  })
})

describe('toggle texts (W8)', () => {
  const profile = (locale: unknown) => blockOf(locale, 'profile') as Record<string, string>

  it('renames the toggle in en, es and pt', () => {
    expect(profile(en).dailyDigest).toBe('Daily emails and notifications')
    expect(profile(es).dailyDigest).toBe('Correos y notificaciones diarios')
    expect(profile(pt).dailyDigest).toBe('E-mails e notificações diários')
  })

  it('names the morning summary and the daily challenge', () => {
    expect(profile(en).dailyDigestDesc).toMatch(/morning summary/)
    expect(profile(en).dailyDigestDesc).toMatch(/daily challenge/)
    expect(profile(es).dailyDigestDesc).toMatch(/desafío diario/)
    expect(profile(pt).dailyDigestDesc).toMatch(/desafio diário/)
  })

  it('says 8am local time, not 8pm EST', () => {
    expect(profile(en).dailyDigestOn).toContain('Every morning at 8am your time')
    expect(profile(es).dailyDigestOn).toContain('8am')
    expect(profile(pt).dailyDigestOn).toContain('8h')
    for (const locale of [en, es, pt]) expect(profile(locale).dailyDigestOn).not.toMatch(/EST|8pm|20h/)
  })
})
