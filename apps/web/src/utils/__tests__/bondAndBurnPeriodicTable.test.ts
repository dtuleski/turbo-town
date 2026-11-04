import { describe, it, expect } from 'vitest'
import {
  DIFFICULTY_CONFIGS,
  ELEMENTS,
  RECIPES,
  getPeriodicTable,
  selectRecipes,
} from '../bondAndBurnData'
import { buildLaunchUrl } from '../questLaunch'

type Diff = 'easy' | 'medium' | 'hard'
const DIFFS: Diff[] = ['easy', 'medium', 'hard']

describe('Bond and Burn: every recipe is completable from the periodic table', () => {
  for (const diff of DIFFS) {
    const config = DIFFICULTY_CONFIGS[diff]
    const tableSymbols = new Set(getPeriodicTable(diff).map(e => e.symbol))

    describe(diff, () => {
      it('only references recipes that exist', () => {
        for (const id of config.availableRecipeIds) {
          expect(RECIPES.find(r => r.id === id), `${diff}: unknown recipe ${id}`).toBeDefined()
        }
      })

      for (const id of config.availableRecipeIds) {
        const recipe = RECIPES.find(r => r.id === id)!
        it(`${recipe.name} (${recipe.formula}): every ingredient is on the table, enabled and defined`, () => {
          for (const { symbol } of recipe.ingredients) {
            expect(tableSymbols.has(symbol), `${diff}/${id}: ${symbol} missing from periodic table`).toBe(true)
            expect(config.elements, `${diff}/${id}: ${symbol} not in config.elements`).toContain(symbol)
            expect(ELEMENTS[symbol], `${diff}/${id}: ${symbol} not in ELEMENTS`).toBeDefined()
          }
        })
      }

      it('shows every configured game element on the table', () => {
        for (const symbol of config.elements) expect(tableSymbols.has(symbol)).toBe(true)
      })

      it('selectRecipes only returns completable recipes', () => {
        for (const recipe of selectRecipes(diff, config.recipes)) {
          for (const { symbol } of recipe.ingredients) expect(tableSymbols.has(symbol)).toBe(true)
        }
      })
    })
  }

  it('Easy shows Na and Cl (Table Salt regression)', () => {
    const symbols = getPeriodicTable('easy').map(e => e.symbol)
    expect(symbols).toEqual(expect.arrayContaining(['Na', 'Cl']))
    expect(DIFFICULTY_CONFIGS.easy.availableRecipeIds).toContain('salt')
  })

  it('table tiles have unique symbols and unique grid cells', () => {
    for (const diff of DIFFS) {
      const t = getPeriodicTable(diff)
      expect(new Set(t.map(e => e.symbol)).size).toBe(t.length)
      expect(new Set(t.map(e => `${e.row}:${e.col}`)).size).toBe(t.length)
    }
  })

  it('unknown difficulty falls back to the easy table', () => {
    expect(getPeriodicTable('1')).toEqual(getPeriodicTable('easy'))
  })

  it('quest launch for Bond and Burn easy/hard resolves to a difficulty with a complete table', () => {
    for (const [d, name] of [[1, 'easy'], [2, 'medium'], [3, 'hard']] as const) {
      const url = buildLaunchUrl(
        { themeId: 'BOND_AND_BURN', difficulty: d },
        { worldId: 'w2', nodeId: 'si-01-bond-burn', legIndex: 0 }
      )!
      expect(new URLSearchParams(url.split('?')[1]).get('difficulty')).toBe(name)
    }
  })
})
