// Circuit Builder — fault tooltip placement.
//
// Pure geometry: converts the first engine fault into percentages of the logical canvas, so the
// tooltip card lands on the faulty cell at any CSS scale, and picks a side and alignment that keep
// the card inside the canvas without covering the cell.

import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  cellToPoint,
} from './circuitBuilderGeometry'
import type { Viewport } from './circuitBuilderGeometry'
import type { Fault, FaultCode } from './circuitEngine'

export type OverlayPlacement = 'above' | 'below'
export type OverlayAlign = 'start' | 'center' | 'end'

export interface FaultOverlay {
  code: FaultCode
  /** i18n keys; the copy lives in the locale files. */
  titleKey: string
  helpKey: string
  /** Anchor, as a percentage of the logical canvas. */
  leftPct: number
  topPct: number
  placement: OverlayPlacement
  align: OverlayAlign
  /** False when the fault carries no grid position and the card sits top-centre. */
  anchored: boolean
  elementIds: readonly string[]
}

/** Anchors in the top band put the card below the cell. */
const BELOW_THRESHOLD_PCT = 28
/** Anchors this close to a side align the card to that side. */
const EDGE_START_PCT = 18
const EDGE_END_PCT = 82
/** Where an unanchored fault card sits. */
const UNANCHORED_LEFT_PCT = 50
const UNANCHORED_TOP_PCT = 4

function isUsableViewport(viewport: Viewport): boolean {
  return (
    Number.isFinite(viewport.originX) &&
    Number.isFinite(viewport.originY) &&
    Number.isFinite(viewport.cellSize) &&
    viewport.cellSize > 0 &&
    Number.isFinite(viewport.cols) &&
    Number.isFinite(viewport.rows)
  )
}

function alignFor(leftPct: number): OverlayAlign {
  if (leftPct < EDGE_START_PCT) return 'start'
  return leftPct > EDGE_END_PCT ? 'end' : 'center'
}

/**
 * The overlay for the first fault (the engine sorts by severity), or `null` when there is no
 * fault or the viewport is unusable.
 */
export function computeFaultOverlay(
  faults: readonly Fault[],
  viewport: Viewport
): FaultOverlay | null {
  const fault = faults[0]
  if (fault === undefined || !isUsableViewport(viewport)) {
    return null
  }

  const base = {
    code: fault.code,
    titleKey: `circuitBuilder.fault.${fault.code}`,
    helpKey: `circuitBuilder.faultHelp.${fault.code}`,
    elementIds: fault.elementIds,
  }

  const at = fault.atPosition
  if (at === undefined || !Number.isFinite(at.col) || !Number.isFinite(at.row)) {
    return {
      ...base,
      leftPct: UNANCHORED_LEFT_PCT,
      topPct: UNANCHORED_TOP_PCT,
      placement: 'below',
      align: 'center',
      anchored: false,
    }
  }

  const point = cellToPoint({ col: at.col, row: at.row }, viewport)
  const leftPct = (point.x / CIRCUIT_CANVAS_WIDTH) * 100
  const topPct = (point.y / CIRCUIT_CANVAS_HEIGHT) * 100
  return {
    ...base,
    leftPct,
    topPct,
    placement: topPct < BELOW_THRESHOLD_PCT ? 'below' : 'above',
    align: alignFor(leftPct),
    anchored: true,
  }
}
