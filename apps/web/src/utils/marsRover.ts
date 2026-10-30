// Circuit Builder — Mars Rover view model.
//
// Pure: turns a level, an engine result and the fuse state into what the rover panel draws. No
// React, no DOM. The machine definition and the activation rules are the engine's own, so the
// panel can never disagree with the success predicate about whether a role is on.

import { evaluateRoleActivation, getMachine } from './circuitEngine'
import type { CircuitResult, ElementKind, LevelDefinition } from './circuitEngine'

export interface RoverRoleView {
  roleId: string
  /** i18n key: the machine's own presentation key. */
  labelKey: string
  active: boolean
  /** The level offers the part this role needs, either to place or already placed. */
  available: boolean
}

export interface RoverView {
  roles: RoverRoleView[]
  /** Every role the level offers is active, and the level offers at least one. */
  allRequiredActive: boolean
}

function offeredKinds(level: LevelDefinition): Set<ElementKind> {
  const kinds = new Set<ElementKind>()
  for (const [kind, count] of Object.entries(level.availableComponents)) {
    if (typeof count === 'number' && count > 0) {
      kinds.add(kind as ElementKind)
    }
  }
  for (const element of level.prePlaced) {
    kinds.add(element.kind)
  }
  return kinds
}

/**
 * Fails closed: no result, a blown fuse or an unknown machine never shows a role as active.
 */
export function deriveRoverView(
  level: LevelDefinition,
  result: CircuitResult | null,
  fuseBlown: boolean
): RoverView {
  const machine = getMachine(level.targetMachineId)
  if (machine === undefined) {
    return { roles: [], allRequiredActive: false }
  }

  const offered = offeredKinds(level)
  const powered = result !== null && !fuseBlown
  const activation = powered ? evaluateRoleActivation(machine, result) : {}

  const roles = machine.roles.map((role) => ({
    roleId: role.roleId,
    labelKey: role.presentationKey,
    active: powered && activation[role.roleId] === true,
    available: offered.has(role.requiredKind),
  }))

  const availableRoles = roles.filter((role) => role.available)
  return {
    roles,
    allRequiredActive: availableRoles.length > 0 && availableRoles.every((role) => role.active),
  }
}
