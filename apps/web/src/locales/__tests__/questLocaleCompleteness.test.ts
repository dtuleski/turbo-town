import { describe, expect, it } from 'vitest'
import en from '../en.json'
import es from '../es.json'
import pt from '../pt.json'
import { QUEST_KNOWN_THEME_IDS, QUEST_WORLDS } from '@/utils/questShared'

/**
 * Quest Map locale gate (NFR-QM-4). i18n falls back to English silently, so this keeps the quest
 * block of es and pt in step with en, and checks the block covers every world, node and theme id
 * the shared quest config can produce.
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

const questOf = (locale: unknown): JsonObject => {
  const block = (locale as JsonObject).quest
  if (block === null || typeof block !== 'object' || Array.isArray(block)) {
    throw new Error('locale has no quest block')
  }
  return block as JsonObject
}

const EN = flatten(questOf(en))
const TRANSLATIONS = [
  ['es', flatten(questOf(es))],
  ['pt', flatten(questOf(pt))],
] as const

/** Proper nouns: product names kept in English in every locale (as in the hub titles). */
const IDENTICAL_ALLOWED: ReadonlySet<string> = new Set([
  'games.BOND_AND_BURN',
  'games.SCRATCH_CODING',
])

const placeholders = (value: JsonValue | undefined): string[] =>
  typeof value === 'string' ? [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort() : []

describe('quest locale completeness', () => {
  it('en declares a non-empty quest block', () => {
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

  it('playsLeft carries {{count}}', () => {
    expect(EN.get('playsLeft')).toContain('{{count}}')
  })

  it('names every theme id of the launch table', () => {
    const missing = QUEST_KNOWN_THEME_IDS.filter((id) => !EN.has(`games.${id}`))
    expect(missing).toEqual([])
  })

  it('names every world and node (including bonus) of the shared config', () => {
    const missing: string[] = []
    for (const world of QUEST_WORLDS) {
      if (!EN.has(`worlds.${world.id}.name`)) missing.push(world.id)
      for (const node of [...world.nodes, world.bonus]) {
        if (!EN.has(`nodes.${node.id}.name`)) missing.push(node.id)
      }
    }
    expect(missing).toEqual([])
  })

  it('has a label for difficulty 1 to 4', () => {
    for (const level of [1, 2, 3, 4]) expect(EN.has(`difficulty.${level}`)).toBe(true)
  })
})
