import { describe, expect, it } from 'vitest'
import {
  CANVAS_PADDING,
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  CONNECTION_HIT_RATIO,
  TERMINAL_OFFSET_RATIO,
  cellToPoint,
  clientToCanvasPoint,
  computeViewport,
  distanceToSegment,
  hitTest,
  pointToCell,
  terminalAnchor,
} from '../circuitBuilderGeometry'
import type { Viewport } from '../circuitBuilderGeometry'
import { connectTerminals, createElement, createLayout, terminalOf } from '../circuitEngine'
import type { CircuitLayout, GridSize, Rotation } from '../circuitEngine'

const CANVAS = { width: CIRCUIT_CANVAS_WIDTH, height: CIRCUIT_CANVAS_HEIGHT }
const SMALL: GridSize = { cols: 8, rows: 6 }
const LARGE: GridSize = { cols: 24, rows: 16 }

describe('computeViewport', () => {
  it('keeps cells square and the grid centred at the smallest grid size', () => {
    const viewport = computeViewport(CANVAS, SMALL)
    const usedWidth = viewport.cellSize * SMALL.cols
    const usedHeight = viewport.cellSize * SMALL.rows
    expect(Math.abs(viewport.originX - (CANVAS.width - usedWidth - viewport.originX))).toBeLessThanOrEqual(1)
    expect(Math.abs(viewport.originY - (CANVAS.height - usedHeight - viewport.originY))).toBeLessThanOrEqual(1)
    expect(usedWidth).toBeLessThanOrEqual(CANVAS.width - 2 * CANVAS_PADDING)
    expect(usedHeight).toBeLessThanOrEqual(CANVAS.height - 2 * CANVAS_PADDING)
  })

  it('keeps cells square and the grid centred at the largest grid size', () => {
    const viewport = computeViewport(CANVAS, LARGE)
    const usedWidth = viewport.cellSize * LARGE.cols
    const usedHeight = viewport.cellSize * LARGE.rows
    expect(Math.abs(viewport.originX - (CANVAS.width - usedWidth - viewport.originX))).toBeLessThanOrEqual(1)
    expect(Math.abs(viewport.originY - (CANVAS.height - usedHeight - viewport.originY))).toBeLessThanOrEqual(1)
    expect(viewport.cols).toBe(LARGE.cols)
    expect(viewport.rows).toBe(LARGE.rows)
  })

  it('never produces a zero cell size, even for an absurd grid', () => {
    expect(computeViewport({ width: 10, height: 10 }, LARGE).cellSize).toBeGreaterThanOrEqual(1)
  })
})

describe('cellToPoint and pointToCell', () => {
  const viewport = computeViewport(CANVAS, SMALL)

  it('round-trips every cell of the grid', () => {
    for (let col = 0; col < SMALL.cols; col += 1) {
      for (let row = 0; row < SMALL.rows; row += 1) {
        expect(pointToCell(cellToPoint({ col, row }, viewport), viewport)).toEqual({ col, row })
      }
    }
  })

  it('rejects a point one pixel outside each of the four edges', () => {
    const right = viewport.originX + viewport.cols * viewport.cellSize
    const bottom = viewport.originY + viewport.rows * viewport.cellSize
    expect(pointToCell({ x: viewport.originX - 1, y: viewport.originY + 5 }, viewport)).toBeNull()
    expect(pointToCell({ x: viewport.originX + 5, y: viewport.originY - 1 }, viewport)).toBeNull()
    expect(pointToCell({ x: right + 1, y: viewport.originY + 5 }, viewport)).toBeNull()
    expect(pointToCell({ x: viewport.originX + 5, y: bottom + 1 }, viewport)).toBeNull()
  })

  it('rejects a non-finite point', () => {
    expect(pointToCell({ x: Number.NaN, y: 0 }, viewport)).toBeNull()
  })
})

describe('clientToCanvasPoint', () => {
  it('undoes a 2x CSS downscale', () => {
    const rect = { left: 0, top: 0, width: CANVAS.width / 2, height: CANVAS.height / 2 }
    const point = clientToCanvasPoint({ x: rect.width / 2, y: rect.height / 2 }, rect, CANVAS)
    expect(point).toEqual({ x: CANVAS.width / 2, y: CANVAS.height / 2 })
  })

  it('accounts for the element offset on the page', () => {
    const rect = { left: 40, top: 12, width: CANVAS.width, height: CANVAS.height }
    expect(clientToCanvasPoint({ x: 140, y: 112 }, rect, CANVAS)).toEqual({ x: 100, y: 100 })
  })

  it('yields a point the grid rejects when the element has not been measured yet', () => {
    const viewport = computeViewport(CANVAS, SMALL)
    const point = clientToCanvasPoint({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 }, CANVAS)
    expect(pointToCell(point, viewport)).toBeNull()
  })
})

describe('terminalAnchor', () => {
  const viewport = computeViewport(CANVAS, SMALL)
  const rotations: readonly Rotation[] = [0, 90, 180, 270]

  it('places the two anchors on the axis the rotation picks', () => {
    const centre = cellToPoint({ col: 3, row: 2 }, viewport)
    const offset = TERMINAL_OFFSET_RATIO * viewport.cellSize
    const expected: Record<Rotation, [{ x: number; y: number }, { x: number; y: number }]> = {
      0: [
        { x: centre.x - offset, y: centre.y },
        { x: centre.x + offset, y: centre.y },
      ],
      90: [
        { x: centre.x, y: centre.y - offset },
        { x: centre.x, y: centre.y + offset },
      ],
      180: [
        { x: centre.x + offset, y: centre.y },
        { x: centre.x - offset, y: centre.y },
      ],
      270: [
        { x: centre.x, y: centre.y + offset },
        { x: centre.x, y: centre.y - offset },
      ],
    }

    for (const rotation of rotations) {
      const element = createElement('wire', { id: 'w1', position: { col: 3, row: 2, rotation } })
      expect(terminalAnchor(element, 0, viewport)).toEqual(expected[rotation][0])
      expect(terminalAnchor(element, 1, viewport)).toEqual(expected[rotation][1])
    }
  })

  it('keeps both anchors inside the element own cell', () => {
    for (const rotation of rotations) {
      const element = createElement('wire', { id: 'w1', position: { col: 3, row: 2, rotation } })
      for (const index of [0, 1] as const) {
        expect(pointToCell(terminalAnchor(element, index, viewport), viewport)).toEqual({
          col: 3,
          row: 2,
        })
      }
    }
  })
})

describe('distanceToSegment', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 10, y: 0 }

  it('is the perpendicular distance for a point beside the segment', () => {
    expect(distanceToSegment({ x: 5, y: 4 }, a, b)).toBeCloseTo(4, 10)
  })

  it('is the distance to the near end for a point before the segment', () => {
    expect(distanceToSegment({ x: -3, y: 4 }, a, b)).toBeCloseTo(5, 10)
  })

  it('is the distance to the far end for a point past the segment', () => {
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBeCloseTo(5, 10)
  })

  it('treats a degenerate segment as a point', () => {
    expect(distanceToSegment(a, a, a)).toBe(0)
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBeCloseTo(5, 10)
  })
})

describe('hitTest priority', () => {
  const viewport: Viewport = computeViewport(CANVAS, SMALL)
  const left = createElement('battery', { id: 'b1', position: { col: 1, row: 1, rotation: 0 } })
  const right = createElement('led', { id: 'l1', position: { col: 4, row: 1, rotation: 0 } })
  const layout: CircuitLayout = createLayout(
    [left, right],
    [connectTerminals(terminalOf(left, 1), terminalOf(right, 0), 'c1')],
    SMALL
  )

  it('returns the terminal for a point on a terminal that also sits on the body', () => {
    const anchor = terminalAnchor(left, 0, viewport)
    expect(pointToCell(anchor, viewport)).toEqual({ col: 1, row: 1 })
    expect(hitTest(anchor, layout, viewport)).toEqual({
      kind: 'terminal',
      elementId: 'b1',
      terminalIndex: 0,
      cell: { col: 1, row: 1 },
      elementKind: 'battery',
    })
  })

  it('returns the element for a point on the body away from both terminals', () => {
    expect(hitTest(cellToPoint({ col: 1, row: 1 }, viewport), layout, viewport)).toEqual({
      kind: 'element',
      elementId: 'b1',
      cell: { col: 1, row: 1 },
      elementKind: 'battery',
    })
  })

  it('returns the connection for a point on the trace away from any element', () => {
    const from = terminalAnchor(left, 1, viewport)
    const to = terminalAnchor(right, 0, viewport)
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    expect(pointToCell(midpoint, viewport)).not.toBeNull()
    expect(hitTest(midpoint, layout, viewport)).toEqual({ kind: 'connection', connectionId: 'c1' })
  })

  it('returns the empty cell for a point just off the trace', () => {
    const from = terminalAnchor(left, 1, viewport)
    const to = terminalAnchor(right, 0, viewport)
    // The trace midpoint sits exactly on the col 2 / col 3 boundary, which `pointToCell` resolves
    // to the higher column. Stepping off the trace vertically must therefore land in col 3.
    const beside = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2 + CONNECTION_HIT_RATIO * viewport.cellSize + 2,
    }
    expect(hitTest(beside, layout, viewport)).toEqual({ kind: 'cell', cell: { col: 3, row: 1 } })
  })

  it('returns outside for a point beyond the grid', () => {
    expect(hitTest({ x: 2, y: 2 }, layout, viewport)).toEqual({ kind: 'outside' })
  })
})
