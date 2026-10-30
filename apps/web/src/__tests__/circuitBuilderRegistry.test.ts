import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import es from '../locales/es.json'
import pt from '../locales/pt.json'

/**
 * Circuit Builder registry consistency check (story CB-5.4, requirement FR-CB-45).
 *
 * A new game must be listed in about ten duplicated registries. The last two
 * games shipped with entries missed, and nothing failed. This check reads the
 * registry sources directly and fails with a message that NAMES the registry
 * that is missing Circuit Builder. It is scoped to Circuit Builder on purpose.
 * To cover another game, copy a check and change the ids below.
 *
 * Intentionally NOT asserted: services/game/src/daily-email.ts ALL_GAMES. That
 * list is already stale for most newer games and is production-affecting, so it
 * is documented in aidlc-docs/construction/reporting-and-data-web instead.
 */

const CATALOG_ID = 'circuit-builder' // hub catalog id, lowercase kebab
const THEME_ID = 'CIRCUIT_BUILDER' // theme, backend, event and leaderboard value
const HUB_CATEGORY = 'Science & Math'
const ICON = '⚡'
const NAME = 'Circuit Builder'

// apps/web has no @types/node, so sources are read through Vite's raw glob instead of node:fs.
// Paths are relative to this file; the glob keys keep that relative form.
const RAW = import.meta.glob<string>(
  [
    '../config/constants.ts',
    '../App.tsx',
    '../pages/hub/GameHubPage.tsx',
    '../components/hub/GameTile.tsx',
    '../api/leaderboard.ts',
    '../components/leaderboard/GameTypeFilter.tsx',
    '../components/dashboard/RecentImprovements.tsx',
    '../pages/admin/AdminDashboard.tsx',
    '../pages/dashboard/HistoryPage.tsx',
    '../pages/dashboard/AchievementsPage.tsx',
    '../pages/dashboard/StatisticsPage.tsx',
    '../../../../services/leaderboard/src/types/index.ts',
    '../../../../services/game/src/services/game.service.ts',
    '../../../../services/game/src/utils/circuit-builder.ts',
    '../../../../services/game/src/services/review.service.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
)

const read = (relPath: string): string => {
  const src = RAW[relPath]
  if (typeof src !== 'string') throw new Error('Registry source not found: ' + relPath)
  return src
}

export interface RegistrySources {
  routeConstants: string
  appRoutes: string
  gameHubPage: string
  gameTile: string
  webLeaderboardApi: string
  gameTypeFilter: string
  recentImprovements: string
  adminDashboard: string
  historyPage: string
  achievementsPage: string
  statisticsPage: string
  leaderboardServiceTypes: string
  gameServiceGameService: string
  gameServiceCircuitUtil: string
  gameServiceReviewService: string
  locales: Record<string, unknown>
}

export const loadSources = (): RegistrySources => ({
  routeConstants: read('../config/constants.ts'),
  appRoutes: read('../App.tsx'),
  gameHubPage: read('../pages/hub/GameHubPage.tsx'),
  gameTile: read('../components/hub/GameTile.tsx'),
  webLeaderboardApi: read('../api/leaderboard.ts'),
  gameTypeFilter: read('../components/leaderboard/GameTypeFilter.tsx'),
  recentImprovements: read('../components/dashboard/RecentImprovements.tsx'),
  adminDashboard: read('../pages/admin/AdminDashboard.tsx'),
  historyPage: read('../pages/dashboard/HistoryPage.tsx'),
  achievementsPage: read('../pages/dashboard/AchievementsPage.tsx'),
  statisticsPage: read('../pages/dashboard/StatisticsPage.tsx'),
  leaderboardServiceTypes: read('../../../../services/leaderboard/src/types/index.ts'),
  gameServiceGameService: read('../../../../services/game/src/services/game.service.ts'),
  gameServiceCircuitUtil: read('../../../../services/game/src/utils/circuit-builder.ts'),
  gameServiceReviewService: read('../../../../services/game/src/services/review.service.ts'),
  locales: { en, es, pt },
})

/** Returns the text of the first `{...}`, `[...]` or `(...)` block that follows `marker`. */
const blockAfter = (src: string, marker: string): string => {
  const start = src.indexOf(marker)
  if (start < 0) return ''
  const open = src.slice(start).search(/[{[(]/)
  if (open < 0) return ''
  const closers: Record<string, string> = { '{': '}', '[': ']', '(': ')' }
  const from = start + open
  const opener = src[from]
  const closer = closers[opener]
  let depth = 0
  for (let i = from; i < src.length; i++) {
    if (src[i] === opener) depth++
    else if (src[i] === closer && --depth === 0) return src.slice(from, i + 1)
  }
  return ''
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Returns one failure message per registry that is missing or wrong for Circuit Builder. */
export const findRegistryFailures = (s: RegistrySources): string[] => {
  const failures: string[] = []
  const fail = (registry: string, fix: string): number => failures.push(`[${registry}] ${fix}`)

  // Theme id as the Game Service defines it, used to resolve the other lists.
  const themeConst = /CIRCUIT_BUILDER_THEME_ID\s*=\s*'([^']+)'/.exec(s.gameServiceCircuitUtil)?.[1]
  if (themeConst !== THEME_ID) {
    fail('services/game utils/circuit-builder.ts CIRCUIT_BUILDER_THEME_ID', `expected '${THEME_ID}', found '${themeConst}'`)
  }

  // 1. Routes
  if (!new RegExp(`CIRCUIT_BUILDER_SETUP:\\s*'/circuit-builder/setup'`).test(s.routeConstants)) {
    fail('apps/web config/constants.ts ROUTES.CIRCUIT_BUILDER_SETUP', `add CIRCUIT_BUILDER_SETUP: '/circuit-builder/setup'`)
  }
  if (!/path=\{ROUTES\.CIRCUIT_BUILDER_SETUP\}/.test(s.appRoutes)) {
    fail('apps/web App.tsx routes', 'register <Route path={ROUTES.CIRCUIT_BUILDER_SETUP} ...>')
  }

  // 2. Hub filter map, and the category must be a real filter chip
  const filterMap = blockAfter(s.gameHubPage, 'const GAME_FILTER_MAP')
  const category = new RegExp(`'${CATALOG_ID}'\\s*:\\s*'([^']+)'`).exec(filterMap)?.[1]
  if (!category) {
    fail('apps/web GameHubPage.tsx GAME_FILTER_MAP', `add '${CATALOG_ID}': '${HUB_CATEGORY}' (without it the tile vanishes under every category filter)`)
  } else {
    const chips = blockAfter(s.gameHubPage, 'const FILTER_CHIPS')
    if (!new RegExp(`id:\\s*'${escape(category)}'`).test(chips)) {
      fail('apps/web GameHubPage.tsx FILTER_CHIPS', `GAME_FILTER_MAP category '${category}' is not a FILTER_CHIPS id`)
    }
    if (category !== HUB_CATEGORY) {
      fail('apps/web GameHubPage.tsx GAME_FILTER_MAP', `expected category '${HUB_CATEGORY}', found '${category}'`)
    }
  }

  // 3. Premium lists must agree: web PREMIUM_GAMES vs backend PAID_GAMES
  const webPremium = blockAfter(s.gameTile, 'export const PREMIUM_GAMES')
  const inWebPremium = new RegExp(`'${CATALOG_ID}'`).test(webPremium)
  if (!inWebPremium) {
    fail('apps/web GameTile.tsx PREMIUM_GAMES', `add '${CATALOG_ID}' (backend blocks Free users, the tile needs the paid badge)`)
  }
  const paid = blockAfter(s.gameServiceGameService, 'const PAID_GAMES')
  const inPaid = paid.includes(`'${THEME_ID}'`) || (paid.includes('CIRCUIT_BUILDER_THEME_ID') && themeConst === THEME_ID)
  if (!inPaid) {
    fail('services/game game.service.ts PAID_GAMES', `add ${THEME_ID} (web PREMIUM_GAMES and backend PAID_GAMES must agree)`)
  }

  // 4. Leaderboard enum value, web vs service vs the gameType the Game Service emits
  const webEnum = new RegExp(`${THEME_ID}\\s*=\\s*'([^']+)'`).exec(s.webLeaderboardApi)?.[1]
  const serviceEnum = new RegExp(`${THEME_ID}\\s*=\\s*'([^']+)'`).exec(s.leaderboardServiceTypes)?.[1]
  if (webEnum !== THEME_ID) {
    fail('apps/web api/leaderboard.ts GameType', `add ${THEME_ID} = '${THEME_ID}' (found ${webEnum === undefined ? 'nothing' : `'${webEnum}'`})`)
  }
  if (serviceEnum !== THEME_ID) {
    fail('services/leaderboard types/index.ts GameType', `expected ${THEME_ID} = '${THEME_ID}' (found ${serviceEnum === undefined ? 'nothing' : `'${serviceEnum}'`})`)
  }
  // The Circuit Builder completion event is the only one whose gameType is the theme constant or literal.
  const emitted = /gameType:\s*(CIRCUIT_BUILDER_THEME_ID|'(CIRCUIT[A-Z_]*)')/.exec(s.gameServiceGameService)
  const emittedValue = emitted ? (emitted[1] === 'CIRCUIT_BUILDER_THEME_ID' ? themeConst : emitted[2]) : undefined
  if (emittedValue !== THEME_ID) {
    fail('services/game game.service.ts publishGameCompleted gameType', `event gameType must equal '${THEME_ID}' (found '${emittedValue}')`)
  }
  if (webEnum && serviceEnum && webEnum !== serviceEnum) {
    fail('GameType web vs leaderboard service', `web '${webEnum}' differs from service '${serviceEnum}'`)
  }

  // 5. Review registry in services/game
  if (!new RegExp(`'${THEME_ID}'`).test(blockAfter(s.gameServiceReviewService, 'const gameTypes'))) {
    fail('services/game review.service.ts getReviewStats gameTypes', `add '${THEME_ID}'`)
  }

  // 6. Display metadata maps
  const entryLiteral = `\\{\\s*icon:\\s*'${ICON}',\\s*name:\\s*'${NAME}'`
  if (!new RegExp(`GameType\\.${THEME_ID}\\]\\s*:\\s*${entryLiteral}`).test(s.recentImprovements)) {
    fail('apps/web RecentImprovements.tsx gameTypeInfo', `add [GameType.${THEME_ID}]: { icon: '${ICON}', name: '${NAME}' }`)
  }
  if (!new RegExp(`value:\\s*GameType\\.${THEME_ID},\\s*label:\\s*'${NAME}',\\s*icon:\\s*'${ICON}'`).test(s.gameTypeFilter)) {
    fail('apps/web GameTypeFilter.tsx game type options', `add { value: GameType.${THEME_ID}, label: '${NAME}', icon: '${ICON}' }`)
  }
  if (!new RegExp(`${THEME_ID}:\\s*'${NAME}'`).test(s.adminDashboard)) {
    fail('apps/web AdminDashboard.tsx GAME_NAMES', `add ${THEME_ID}: '${NAME}'`)
  }
  if (!new RegExp(`${THEME_ID}:\\s*'${ICON}'`).test(s.adminDashboard)) {
    fail('apps/web AdminDashboard.tsx GAME_ICONS', `add ${THEME_ID}: '${ICON}'`)
  }
  const gameInfo = new RegExp(`${THEME_ID}:\\s*${entryLiteral}`)
  if (!gameInfo.test(s.historyPage)) fail('apps/web HistoryPage.tsx GAME_INFO', `add ${THEME_ID}`)
  if (!gameInfo.test(s.achievementsPage)) fail('apps/web AchievementsPage.tsx GAME_INFO', `add ${THEME_ID}`)
  if (!gameInfo.test(s.statisticsPage)) fail('apps/web StatisticsPage.tsx GAME_INFO', `add ${THEME_ID}`)

  // 7. Hub tile translations in every locale
  for (const [locale, json] of Object.entries(s.locales)) {
    const tile = (json as { games?: Record<string, Record<string, unknown>> }).games?.[CATALOG_ID]
    for (const key of ['title', 'description', 'category']) {
      const value = tile?.[key]
      if (typeof value !== 'string' || value.trim() === '') {
        fail(`apps/web locales/${locale}.json games.${CATALOG_ID}.${key}`, 'add the hub tile translation')
      }
    }
  }

  // 8. Catalog id -> theme id by the review join rule used in the hub
  if (!/game\.gameId\.toUpperCase\(\)\.replace\(\/-\/g, '_'\)/.test(s.gameHubPage)) {
    fail('apps/web GameHubPage.tsx review join', 'the catalog id to theme id conversion (toUpperCase + replace dashes) changed; re-check the join')
  }
  if (CATALOG_ID.toUpperCase().replace(/-/g, '_') !== THEME_ID) {
    fail('catalog id to theme id', `'${CATALOG_ID}' does not convert to '${THEME_ID}'`)
  }

  return failures
}

describe('Circuit Builder registry consistency', () => {
  it('is registered in every hub, leaderboard, display and backend registry', () => {
    const failures = findRegistryFailures(loadSources())
    expect(failures, `Circuit Builder registry gaps:\n${failures.join('\n')}`).toEqual([])
  })
})

describe('Circuit Builder registry check can fail (mutation proof)', () => {
  const strip = (src: string, pattern: RegExp): string => {
    const out = src.replace(pattern, '')
    expect(out, `mutation pattern ${pattern} did not change the source, the proof is void`).not.toBe(src)
    return out
  }
  const cases: Array<[string, (s: RegistrySources) => RegistrySources, string]> = [
    ['GAME_FILTER_MAP entry removed', (s) => ({ ...s, gameHubPage: strip(s.gameHubPage, /\s*'circuit-builder': 'Science & Math',/) }), 'GAME_FILTER_MAP'],
    ['PREMIUM_GAMES entry removed', (s) => ({ ...s, gameTile: strip(s.gameTile, /, 'circuit-builder'/) }), 'PREMIUM_GAMES'],
    ['web GameType value removed', (s) => ({ ...s, webLeaderboardApi: strip(s.webLeaderboardApi, /\s*CIRCUIT_BUILDER = 'CIRCUIT_BUILDER',/) }), 'api/leaderboard.ts GameType'],
    ['web GameType value changed', (s) => ({ ...s, webLeaderboardApi: s.webLeaderboardApi.replace("CIRCUIT_BUILDER = 'CIRCUIT_BUILDER'", "CIRCUIT_BUILDER = 'CIRCUIT'") }), 'GameType'],
    ['GameTypeFilter option removed', (s) => ({ ...s, gameTypeFilter: strip(s.gameTypeFilter, /\s*\{ value: GameType\.CIRCUIT_BUILDER[^\n]*\},/) }), 'GameTypeFilter.tsx'],
    ['RecentImprovements entry removed', (s) => ({ ...s, recentImprovements: strip(s.recentImprovements, /\s*\[GameType\.CIRCUIT_BUILDER\][^\n]*/) }), 'RecentImprovements.tsx'],
    ['AdminDashboard name removed', (s) => ({ ...s, adminDashboard: strip(s.adminDashboard, / CIRCUIT_BUILDER: 'Circuit Builder',/) }), 'AdminDashboard.tsx GAME_NAMES'],
    ['HistoryPage entry removed', (s) => ({ ...s, historyPage: strip(s.historyPage, /\s*CIRCUIT_BUILDER:[^\n]*/) }), 'HistoryPage.tsx'],
    ['AchievementsPage entry removed', (s) => ({ ...s, achievementsPage: strip(s.achievementsPage, /\s*CIRCUIT_BUILDER:[^\n]*/) }), 'AchievementsPage.tsx'],
    ['StatisticsPage entry removed', (s) => ({ ...s, statisticsPage: strip(s.statisticsPage, /\s*CIRCUIT_BUILDER:[^\n]*/) }), 'StatisticsPage.tsx'],
    ['backend PAID_GAMES entry removed', (s) => ({ ...s, gameServiceGameService: s.gameServiceGameService.replace(/(const PAID_GAMES = \[[^\]]*?), CIRCUIT_BUILDER_THEME_ID\]/, '$1]') }), 'PAID_GAMES'],
    ['emitted event gameType changed', (s) => ({ ...s, gameServiceGameService: s.gameServiceGameService.replace('gameType: CIRCUIT_BUILDER_THEME_ID', "gameType: 'CIRCUIT_BUILD'") }), 'publishGameCompleted gameType'],
    ['review registry entry removed', (s) => ({ ...s, gameServiceReviewService: strip(s.gameServiceReviewService, /, 'CIRCUIT_BUILDER',/) }), 'review.service.ts'],
    ['route registration removed', (s) => ({ ...s, appRoutes: strip(s.appRoutes, /<Route path=\{ROUTES\.CIRCUIT_BUILDER_SETUP\}[^\n]*/) }), 'App.tsx routes'],
    ['es translation removed', (s) => ({ ...s, locales: { ...s.locales, es: { games: {} } } }), 'locales/es.json'],
  ]

  it.each(cases)('fails and names the registry when: %s', (_label, mutate, expectedName) => {
    const failures = findRegistryFailures(mutate(loadSources()))
    expect(failures.length).toBeGreaterThan(0)
    expect(failures.join('\n')).toContain(expectedName)
  })
})
