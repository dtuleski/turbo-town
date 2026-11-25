// Circuit Builder - pure helpers behind the on-canvas and on-screen affordances: which dots are
// valid link targets, which action buttons to show, and the polarity marks and captions the
// renderer draws. React free and canvas free so each rule is directly testable.

import { ELEMENT_SPECS } from './circuitEngine'
import type { ElementKind } from './circuitEngine'
import type { SelectionState } from './circuitBuilderInteraction'
import type { CircuitBuilderState, TerminalRef } from './circuitBuilderState'

/**
 * Every terminal the pending one could be linked to: all of them except the pending terminal
 * itself and any terminal it is already directly linked to (the reducer rejects both).
 */
export function connectionTargets(
  layout: CircuitBuilderState['layout'],
  pending: TerminalRef
): TerminalRef[] {
  const source = layout.elements.find((element) => element.id === pending.elementId)
  if (source === undefined) return []
  const sourceNode = source.terminals[pending.terminalIndex]
  const linked = new Set<string>()
  for (const connection of layout.connections) {
    if (connection.from === sourceNode) linked.add(connection.to)
    if (connection.to === sourceNode) linked.add(connection.from)
  }
  const targets: TerminalRef[] = []
  for (const element of layout.elements) {
    for (const terminalIndex of [0, 1] as const) {
      const node = element.terminals[terminalIndex]
      if (node === sourceNode || linked.has(node)) continue
      targets.push({ elementId: element.id, terminalIndex })
    }
  }
  return targets
}

export interface ActionBarState {
  /** The selected part, when it exists and may be removed. */
  removableElementId: string | null
  /** True while a tray part is armed or a link is half made (the Escape equivalent). */
  canCancel: boolean
}

export function selectActionBar(
  state: CircuitBuilderState,
  selection: SelectionState
): ActionBarState {
  const id = selection.selectedElementId
  const removable =
    id !== null &&
    state.layout.elements.some((element) => element.id === id) &&
    !state.lockedElementIds.includes(id)
  return {
    removableElementId: removable ? id : null,
    canCancel: selection.armedKind !== null || selection.pendingTerminal !== null,
  }
}

/** Sources and polarized parts have a + side (terminal 0) and a - side (terminal 1). */
export function polarityMarks(kind: ElementKind): readonly [string, string] | null {
  const spec = ELEMENT_SPECS[kind]
  return spec.isSource || spec.polarized ? ['+', '\u2212'] : null
}

/** Part caption: the abbreviation, with an arrow for parts that only work one way round. */
export function partCaption(kind: ElementKind, abbr: string): string {
  return ELEMENT_SPECS[kind].polarized ? `${abbr} \u2192` : abbr
}
