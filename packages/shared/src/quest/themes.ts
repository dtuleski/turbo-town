/**
 * Quest Map - allowlist of theme ids a quest leg may use (FR-QM-2 AC2, "unknown themeId").
 *
 * Sources (read when this list was written; the lists are copies, so the config test
 * guards the real config against them and QM3 compares the card ids with the web constant):
 *  - Card themes: `GAME_THEMES` in `apps/web/src/config/constants.ts` (Memory Match).
 *  - Game themes: themeId strings used by the Game Service per-game branches and the
 *    `preAccuracy` list in `services/game/src/services/game.service.ts` (`completeGame`),
 *    `CIRCUIT_BUILDER_THEME_ID` in `services/game/src/utils/circuit-builder.ts`, and the
 *    `startGame({ themeId })` calls in `apps/web/src/pages/*`.
 * `LANGUAGE_PRONUNCIATION` is paid but deliberately absent: language games are out of v1.
 */

/** Memory Match card themes. */
export const QUEST_CARD_THEME_IDS: readonly string[] = Object.freeze([
  'ANIMALS',
  'FRUITS',
  'VEHICLES',
  'SPACE',
  'OCEAN',
  'FORMULA1',
]);

/** The 13 non-card game themeIds usable by quest legs. */
export const QUEST_GAME_THEME_IDS: readonly string[] = Object.freeze([
  'MATH_CHALLENGE',
  'WORD_PUZZLE',
  'SEQUENCE_MEMORY',
  'PATTERN_RECALL',
  'GEO_QUIZ',
  'MATH_MAZE',
  'BUBBLE_POP',
  'BOND_AND_BURN',
  'SPACE_ENTRY',
  'TRAFFIC_LAB',
  'MINI_GOLF',
  'SCRATCH_CODING',
  'CIRCUIT_BUILDER',
]);

/** Allowlist for config validation: union of the card and game theme ids. */
export const QUEST_KNOWN_THEME_IDS: readonly string[] = Object.freeze([
  ...QUEST_CARD_THEME_IDS,
  ...QUEST_GAME_THEME_IDS,
]);
