import type { QuestResultPayload } from '@/types/quest'
import { buildLaunchUrl, parseQuestParam } from '@/utils/questLaunch'

/** R2: the result modal is in quest mode when the URL has a valid quest param or a result exists. */
export function isQuestMode(search: string, result: QuestResultPayload | null): boolean {
  return parseQuestParam(search) !== null || result !== null
}

/** URL of the next boss leg, or null when the run has no next leg. */
export function getNextLegUrl(result: QuestResultPayload | null): string | null {
  const gauntlet = result?.gauntlet
  if (!result || !gauntlet || gauntlet.status !== 'IN_PROGRESS' || !gauntlet.nextLeg) return null
  return buildLaunchUrl(gauntlet.nextLeg, {
    worldId: result.worldId,
    nodeId: result.nodeId,
    legIndex: gauntlet.legIndex + 1,
  })
}
