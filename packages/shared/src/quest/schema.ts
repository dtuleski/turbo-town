/**
 * Quest Map - request context schema (NFR-QM-5, SECURITY-05).
 *
 * Shape only: existence of the world or node, tier, unlock state and leg order are checked by
 * the Game Service. Unknown keys are stripped (zod default object mode). No string coercion.
 */
import { z } from 'zod';
import type { QuestContext } from './types';

const QUEST_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

export const questContextSchema: z.ZodType<QuestContext> = z.object({
  worldId: z.string().regex(QUEST_ID_PATTERN),
  nodeId: z.string().regex(QUEST_ID_PATTERN),
  legIndex: z.number().int().min(0).max(2),
});
