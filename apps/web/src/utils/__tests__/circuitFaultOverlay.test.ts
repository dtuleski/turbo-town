import { describe, expect, it } from 'vitest'
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  cellToPoint,
  computeViewport,
} from '../circuitBuilderGeometry'
import type { Viewport } from '../circuitBuilderGeometry'
import { computeFaultOverlay } from '../circuitFaultOverlay'
import type { Fault } from '../circuitEngine'
import { SHORTED, TEST_GRID, layoutFromRecipe, solveLayout } from './circuitTestLayouts'

const VIEWPORT: Viewport = computeViewport(
  { width: CIRCUIT_CANVAS_WIDTH, height: CIRCUIT_CANVAS_HEIGHT },
  TEST_GRID
)

function faultAt(col: number, row: number, code: Fault['code'] = 'OVERCURRENT'): Fault {
  return { code, elementIds: ['x'], atPosition: { col, row, rotation: 0 } }
}

describe('computeFaultOverlay', () => {
  it('maps a real short-circuit fault to percentages of the canvas', () => {
    const layout = layoutFromRecipe(SHORTED, TEST_GRID)
    const result = solveLayout(layout, SHORTED.switches)
    const fault = result.faults[0]
    expect(fault?.atPosition).toBeDefined()
    const overlay = computeFaultOverlay(result.faults, VIEWPORT)
    if (overlay === null || fault?.atPosition === undefined) throw new Error('no overlay')

    const point = cellToPoint(
      { col: fault.atPosition.col, row: fault.atPosition.row },
      VIEWPORT
    )
    expect(overlay.anchored).toBe(true)
    expect(overlay.code).toBe('SHORT_CIRCUIT')
    expect(overlay.leftPct).toBeCloseTo((point.x / CIRCUIT_CANVAS_WIDTH) * 100, 10)
    expect(overlay.topPct).toBeCloseTo((point.y / CIRCUIT_CANVAS_HEIGHT) * 100, 10)
    expect(overlay.titleKey).toBe('circuitBuilder.fault.SHORT_CIRCUIT')
    expect(overlay.helpKey).toBe('circuitBuilder.faultHelp.SHORT_CIRCUIT')
  })

  it('computes exact percentages for a known cell on a 12x8 grid', () => {
    // 12x8 in 960x640: usable 928x608, cell 76, origin (24, 16).
    expect(VIEWPORT.cellSize).toBe(76)
    expect(VIEWPORT.originX).toBe(24)
    expect(VIEWPORT.originY).toBe(16)
    const overlay = computeFaultOverlay([faultAt(5, 3)], VIEWPORT)
    if (overlay === null) throw new Error('no overlay')
    expect(overlay.leftPct).toBeCloseTo(((24 + 5.5 * 76) / 960) * 100, 10)
    expect(overlay.topPct).toBeCloseTo(((16 + 3.5 * 76) / 640) * 100, 10)
    expect(overlay.placement).toBe('above')
    expect(overlay.align).toBe('center')
  })

  it('flips below for the top row', () => {
    const overlay = computeFaultOverlay([faultAt(5, 0)], VIEWPORT)
    expect(overlay?.placement).toBe('below')
  })

  it('aligns to the start at the left column and the end at the right column', () => {
    expect(computeFaultOverlay([faultAt(0, 4)], VIEWPORT)?.align).toBe('start')
    expect(computeFaultOverlay([faultAt(11, 4)], VIEWPORT)?.align).toBe('end')
  })

  it('anchors a position-less fault top-centre and marks it unanchored', () => {
    const overlay = computeFaultOverlay(
      [{ code: 'SINGULAR_SYSTEM', elementIds: [] }],
      VIEWPORT
    )
    expect(overlay).not.toBeNull()
    expect(overlay?.anchored).toBe(false)
    expect(overlay?.leftPct).toBe(50)
    expect(overlay?.align).toBe('center')
    expect(overlay?.placement).toBe('below')
  })

  it('uses the first fault, which the engine sorts by severity', () => {
    const overlay = computeFaultOverlay(
      [faultAt(2, 2, 'SHORT_CIRCUIT'), faultAt(9, 6, 'OVERCURRENT')],
      VIEWPORT
    )
    expect(overlay?.code).toBe('SHORT_CIRCUIT')
  })

  it('returns null without faults', () => {
    expect(computeFaultOverlay([], VIEWPORT)).toBeNull()
  })

  it('fails closed on a non-finite or empty viewport', () => {
    const fault = [faultAt(1, 1)]
    expect(computeFaultOverlay(fault, { ...VIEWPORT, cellSize: Number.NaN })).toBeNull()
    expect(computeFaultOverlay(fault, { ...VIEWPORT, originX: Number.POSITIVE_INFINITY })).toBeNull()
    expect(computeFaultOverlay(fault, { ...VIEWPORT, cellSize: 0 })).toBeNull()
  })

  it('treats a non-finite fault position as unanchored', () => {
    const overlay = computeFaultOverlay(
      [{ code: 'OVERCURRENT', elementIds: [], atPosition: { col: Number.NaN, row: 1, rotation: 0 } }],
      VIEWPORT
    )
    expect(overlay?.anchored).toBe(false)
  })
})
