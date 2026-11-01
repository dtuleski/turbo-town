// Quest Map - shared config and types funnel.
//
// This is the ONLY module in apps/web that names packages/shared/src/quest. Everything else in the
// web imports quest config and types through this file (same pattern as circuitEngine.ts), so a
// later switch to a package-name import is a change to a few lines here and nothing else.
//
// It imports per file (types, config, themes) and NOT the quest index, because the index also
// loads schema.ts (zod), which the web does not need.
//
// ============================================================================
// DEPLOYMENT RISK (shared with circuitEngine.ts) - the owner's decision
// ============================================================================
// These relative imports reach OUTSIDE apps/web. They resolve locally because a development
// machine has the whole monorepo on disk. A Vercel deploy that uploads only apps/web would not
// have packages/shared in the build context. Resolving this is an infrastructure decision (root
// directory, registry or staging step). Do not vendor a copy of the quest config into apps/web:
// the server and the web must read the same file.
// ============================================================================
export type {
  BadgeId,
  GauntletStatus,
  NodeStatus,
  QuestAccessTier,
  QuestContext,
  QuestDifficulty,
  QuestLeg,
  QuestNode,
  QuestNodeKind,
  QuestWorld,
  Stars,
} from '../../../../packages/shared/src/quest/types'

export {
  QUEST_WORLDS,
  getNode,
  getWorld,
  listWorlds,
} from '../../../../packages/shared/src/quest/config'

export {
  QUEST_CARD_THEME_IDS,
  QUEST_GAME_THEME_IDS,
  QUEST_KNOWN_THEME_IDS,
} from '../../../../packages/shared/src/quest/themes'
