import type { QuestProgressView, QuestWorldView } from '@/types/quest'
import type { BadgeId } from '@/utils/questShared'

/**
 * Pure badge view logic (QM4). The server decides which badges a world has earned (`world.badges`);
 * nothing here recomputes the rules, it only maps that list to a fixed locked/earned display.
 */
export const BADGE_IDS: readonly BadgeId[] = ['WORLD_CLEARED', 'WORLD_MASTERED']

export interface WorldBadge {
  id: BadgeId
  earned: boolean
}

/** Both badges in display order; ids the client does not know are ignored. */
export function deriveWorldBadges(world: Pick<QuestWorldView, 'badges'>): WorldBadge[] {
  const owned = new Set<string>(Array.isArray(world.badges) ? world.badges : [])
  return BADGE_IDS.map((id) => ({ id, earned: owned.has(id) }))
}

export interface QuestBadgeSummary {
  earned: number
  total: number
}

export function summarizeBadges(progress: Pick<QuestProgressView, 'worlds'>): QuestBadgeSummary {
  let earned = 0
  for (const world of progress.worlds) {
    earned += deriveWorldBadges(world).filter((badge) => badge.earned).length
  }
  return { earned, total: progress.worlds.length * BADGE_IDS.length }
}

/** Key used to mark a badge earned in the game just finished. */
export const badgeKey = (worldId: string, badgeId: string): string => `${worldId}:${badgeId}`
