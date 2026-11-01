import { describe, expect, it } from 'vitest'
import { GAME_THEMES, ROUTES } from '@/config/constants'
import {
  QUEST_LAUNCH_TABLE,
  buildLaunchUrl,
  getGameNameKey,
  parseQuestParam,
  resolveGameSettings,
} from '../questLaunch'
import {
  QUEST_CARD_THEME_IDS,
  QUEST_GAME_THEME_IDS,
  QUEST_KNOWN_THEME_IDS,
  QUEST_WORLDS,
} from '../questShared'

const REF = { worldId: 'brain-peaks', nodeId: 'bp-02-math', legIndex: 0 }
const SUFFIX = 'quest=brain-peaks%3Abp-02-math%3A0'

describe('parseQuestParam', () => {
  it('parses a valid param', () => {
    expect(parseQuestParam('?quest=brain-peaks:bp-01-memory:0')).toEqual({
      worldId: 'brain-peaks',
      nodeId: 'bp-01-memory',
      legIndex: 0,
    })
  })
  it('accepts an encoded colon and other params around it', () => {
    expect(parseQuestParam('?difficulty=easy&quest=a%3Ab%3A2&x=1')).toEqual({
      worldId: 'a',
      nodeId: 'b',
      legIndex: 2,
    })
  })
  it.each([
    ['empty', ''],
    ['no quest', '?difficulty=easy'],
    ['two parts', '?quest=a:b'],
    ['four parts', '?quest=a:b:0:1'],
    ['uppercase', '?quest=A:b:0'],
    ['underscore', '?quest=a_b:c:0'],
    ['space', '?quest=a%20b:c:0'],
    ['empty world', '?quest=:b:0'],
    ['empty node', '?quest=a::0'],
    ['legIndex 3', '?quest=a:b:3'],
    ['legIndex -1', '?quest=a:b:-1'],
    ['legIndex 1.5', '?quest=a:b:1.5'],
    ['legIndex text', '?quest=a:b:a'],
    ['legIndex empty', '?quest=a:b:'],
    ['legIndex 01', '?quest=a:b:01'],
    ['bad percent encoding', '?quest=%E0%A4%A'],
    ['script', '?quest=<script>:b:0'],
  ])('rejects %s', (_label, search) => {
    expect(parseQuestParam(search)).toBeNull()
  })
  it('rejects a 41 character id and accepts 40', () => {
    expect(parseQuestParam(`?quest=${'a'.repeat(41)}:b:0`)).toBeNull()
    expect(parseQuestParam(`?quest=${'a'.repeat(40)}:b:0`)).not.toBeNull()
  })
  it('uses the first quest param when there are duplicates', () => {
    expect(parseQuestParam('?quest=a:b:0&quest=c:d:1')?.worldId).toBe('a')
    expect(parseQuestParam('?quest=bad&quest=c:d:1')).toBeNull()
  })
  it('never throws on junk', () => {
    for (const junk of ['?%', '?quest=%', '??&&==', '?quest', 'quest=a:b:0']) {
      expect(() => parseQuestParam(junk)).not.toThrow()
    }
  })
})

describe('buildLaunchUrl', () => {
  it.each(QUEST_CARD_THEME_IDS.map((id) => [id]))('card theme %s uses the Memory Match page', (id) => {
    expect(buildLaunchUrl({ themeId: id, difficulty: 2 }, REF)).toBe(
      `${ROUTES.GAME}?theme=${id}&difficulty=medium&${SUFFIX}`
    )
  })

  const simple: [string, string][] = [
    ['MATH_CHALLENGE', ROUTES.MATH_GAME],
    ['WORD_PUZZLE', ROUTES.WORD_PUZZLE_GAME],
    ['GEO_QUIZ', ROUTES.GEO_QUIZ_GAME],
    ['MATH_MAZE', ROUTES.MATH_MAZE_GAME],
    ['BUBBLE_POP', ROUTES.BUBBLE_POP_GAME],
    ['BOND_AND_BURN', ROUTES.BOND_AND_BURN_GAME],
    ['SPACE_ENTRY', ROUTES.SPACE_ENTRY_GAME],
    ['TRAFFIC_LAB', ROUTES.TRAFFIC_LAB_GAME],
    ['MINI_GOLF', ROUTES.MINI_GOLF_GAME],
    ['SCRATCH_CODING', ROUTES.SCRATCH_CODING_GAME],
  ]
  it.each(simple)('%s builds ?difficulty=<name>', (id, route) => {
    expect(buildLaunchUrl({ themeId: id, difficulty: 1 }, REF)).toBe(
      `${route}?difficulty=easy&${SUFFIX}`
    )
    expect(buildLaunchUrl({ themeId: id, difficulty: 3 }, REF)).toBe(
      `${route}?difficulty=hard&${SUFFIX}`
    )
  })

  it('SEQUENCE_MEMORY adds theme only when pageTheme is present', () => {
    expect(buildLaunchUrl({ themeId: 'SEQUENCE_MEMORY', difficulty: 2 }, REF)).toBe(
      `${ROUTES.SEQUENCE_MEMORY_GAME}?difficulty=medium&${SUFFIX}`
    )
    expect(
      buildLaunchUrl({ themeId: 'SEQUENCE_MEMORY', difficulty: 2, params: { pageTheme: 'colors' } }, REF)
    ).toBe(`${ROUTES.SEQUENCE_MEMORY_GAME}?difficulty=medium&theme=colors&${SUFFIX}`)
  })

  it('PATTERN_RECALL needs pageTheme', () => {
    expect(buildLaunchUrl({ themeId: 'PATTERN_RECALL', difficulty: 2 }, REF)).toBeNull()
    expect(
      buildLaunchUrl({ themeId: 'PATTERN_RECALL', difficulty: 2, params: { pageTheme: 'shapes' } }, REF)
    ).toBe(`${ROUTES.PATTERN_RECALL_GAME}?theme=shapes&difficulty=medium&${SUFFIX}`)
  })

  it('CIRCUIT_BUILDER needs levelId and allows difficulty 1 to 4', () => {
    expect(buildLaunchUrl({ themeId: 'CIRCUIT_BUILDER', difficulty: 2 }, REF)).toBeNull()
    expect(
      buildLaunchUrl({ themeId: 'CIRCUIT_BUILDER', difficulty: 4, params: { levelId: 'lvl-1' } }, REF)
    ).toBe(`${ROUTES.CIRCUIT_BUILDER_GAME}?difficulty=4&level=lvl-1&${SUFFIX}`)
    expect(
      buildLaunchUrl({ themeId: 'CIRCUIT_BUILDER', difficulty: 5, params: { levelId: 'lvl-1' } }, REF)
    ).toBeNull()
  })

  it('encodes values instead of concatenating them raw', () => {
    const url = buildLaunchUrl(
      { themeId: 'CIRCUIT_BUILDER', difficulty: 1, params: { levelId: 'a&b=c d' } },
      REF
    )
    expect(url).toContain('level=a%26b%3Dc+d')
  })

  it('returns null for difficulty 4 on a non-Circuit game and for out-of-range values', () => {
    expect(buildLaunchUrl({ themeId: 'MATH_CHALLENGE', difficulty: 4 }, REF)).toBeNull()
    expect(buildLaunchUrl({ themeId: 'ANIMALS', difficulty: 4 }, REF)).toBeNull()
    expect(buildLaunchUrl({ themeId: 'MATH_CHALLENGE', difficulty: 0 }, REF)).toBeNull()
  })

  it('returns null for unknown or prototype-like themeIds', () => {
    expect(buildLaunchUrl({ themeId: 'NOPE', difficulty: 1 }, REF)).toBeNull()
    expect(buildLaunchUrl({ themeId: 'constructor', difficulty: 1 }, REF)).toBeNull()
    expect(getGameNameKey('toString')).toBeNull()
  })

  it('has a launch row for every known themeId (19) and no extras', () => {
    expect(QUEST_KNOWN_THEME_IDS).toHaveLength(19)
    expect(Object.keys(QUEST_LAUNCH_TABLE).sort()).toEqual([...QUEST_KNOWN_THEME_IDS].sort())
    for (const id of QUEST_GAME_THEME_IDS) {
      expect(getGameNameKey(id)).toBe(`quest.games.${id}`)
    }
  })

  it('every leg used in the shared quest config builds a non-null URL', () => {
    for (const world of QUEST_WORLDS) {
      for (const node of [...world.nodes, world.bonus]) {
        node.legs.forEach((leg, legIndex) => {
          const url = buildLaunchUrl(leg, { worldId: world.id, nodeId: node.id, legIndex })
          expect(url, `${world.id}/${node.id}/${legIndex}`).not.toBeNull()
        })
      }
    }
  })

  it('card theme ids match GAME_THEMES in the web constants', () => {
    expect([...QUEST_CARD_THEME_IDS].sort()).toEqual(GAME_THEMES.map((t) => t.id).sort())
  })
})

describe('resolveGameSettings', () => {
  it('router state wins', () => {
    expect(
      resolveGameSettings({ theme: 'SPACE', difficulty: 'HARD' }, '?theme=ANIMALS&difficulty=easy')
    ).toEqual({ theme: 'SPACE', difficulty: 'HARD' })
  })
  it('falls back to the query', () => {
    expect(resolveGameSettings(null, '?theme=OCEAN&difficulty=hard')).toEqual({
      theme: 'OCEAN',
      difficulty: 'HARD',
    })
    expect(resolveGameSettings(undefined, '?theme=FORMULA1&difficulty=Medium')).toEqual({
      theme: 'FORMULA1',
      difficulty: 'MEDIUM',
    })
  })
  it('returns nothing for unknown theme, bad difficulty or missing values', () => {
    expect(resolveGameSettings(null, '?theme=NOPE&difficulty=easy')).toEqual({})
    expect(resolveGameSettings(null, '?theme=ANIMALS&difficulty=super_hard')).toEqual({})
    expect(resolveGameSettings(null, '?theme=ANIMALS&difficulty=constructor')).toEqual({})
    expect(resolveGameSettings(null, '')).toEqual({})
    expect(resolveGameSettings({}, '?difficulty=easy')).toEqual({})
  })
  it('round-trips every card theme launch URL', () => {
    for (const id of QUEST_CARD_THEME_IDS) {
      for (const [level, expected] of [
        [1, 'EASY'],
        [2, 'MEDIUM'],
        [3, 'HARD'],
      ] as const) {
        const url = buildLaunchUrl({ themeId: id, difficulty: level }, REF) as string
        expect(resolveGameSettings(null, url.slice(url.indexOf('?')))).toEqual({
          theme: id,
          difficulty: expected,
        })
      }
    }
  })
})
