// Circuit Builder — sandbox session (S2).
//
// Free play: no game is started, nothing is submitted, no score exists. This module deliberately
// imports the engine wrapper and nothing else, so the sandbox page cannot reach the API layer, the
// GraphQL client or the guided session even by accident. circuitSandboxIsolation.test.ts proves it
// by walking the module graph.

import { getLevel } from '@/utils/circuitEngine'
import type { LevelDefinition } from '@/utils/circuitEngine'

export interface SandboxSession {
  kind: 'sandbox'
  /** `undefined` only if the engine registry lost its sandbox entry; the page then shows a fallback. */
  level: LevelDefinition | undefined
}

export function createSandboxSession(): SandboxSession {
  return { kind: 'sandbox', level: getLevel('sandbox') }
}
