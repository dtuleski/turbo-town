import type { TFunction } from 'i18next'

/** Node name from `quest.nodes.<id>.name`; an id unknown to the client falls back to the id. */
export const nodeName = (t: TFunction, nodeId: string): string =>
  t(`quest.nodes.${nodeId}.name`, { defaultValue: nodeId })

export const worldName = (t: TFunction, worldId: string): string =>
  t(`quest.worlds.${worldId}.name`, { defaultValue: worldId })

/** True when the client has a locale name for the node (used to skip unknown ids). */
export const hasNodeName = (t: TFunction, nodeId: string): boolean =>
  t(`quest.nodes.${nodeId}.name`, { defaultValue: '' }) !== ''
