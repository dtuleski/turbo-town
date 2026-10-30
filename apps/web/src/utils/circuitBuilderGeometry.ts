// Circuit Builder — canvas geometry, snap-to-grid, and hit testing.
//
// Shared by the renderer (C1) and the interaction controller (C2). Framework free: no React, no
// DOM node, no event object. Every coordinate here is a LOGICAL canvas pixel; the browser's CSS
// scaling is undone once, in `clientToCanvasPoint`.

import type { CircuitElement, CircuitLayout, ElementId, ElementKind, GridSize } from './circuitEngine'

/** A point in logical canvas pixels. */
export interface Point {
  x: number
  y: number
}

/** A grid cell: `GridPosition` without the rotation. */
export interface GridCell {
  col: number
  row: number
}

export interface Viewport {
  /** Logical-pixel offset of the grid's top-left corner inside the canvas. */
  originX: number
  originY: number
  /** Edge length of one square cell, in logical pixels. */
  cellSize: number
  cols: number
  rows: number
}

export type HitTarget =
  | {
      kind: 'terminal'
      elementId: ElementId
      terminalIndex: 0 | 1
      cell: GridCell
      elementKind: ElementKind
    }
  | { kind: 'element'; elementId: ElementId; cell: GridCell; elementKind: ElementKind }
  | { kind: 'connection'; connectionId: string }
  | { kind: 'cell'; cell: GridCell }
  | { kind: 'outside' }

/**
 * One fixed logical canvas for every grid size, 3:2 to match the 24x16 grid ceiling.
 *
 * Levels range from 8x6 to 24x16. Resizing the backing store per level would invalidate every
 * cached coordinate mid-session, so instead the grid is letterboxed inside a constant canvas and
 * only `cellSize` changes. CSS then scales the single canvas responsively.
 */
export const CIRCUIT_CANVAS_WIDTH = 960
export const CIRCUIT_CANVAS_HEIGHT = 640

/** Logical pixels kept clear around the grid. */
export const CANVAS_PADDING = 16

/** Terminal grab radius, as a fraction of `cellSize`. */
export const TERMINAL_HIT_RATIO = 0.28

/** Connection grab distance, as a fraction of `cellSize`. */
export const CONNECTION_HIT_RATIO = 0.12

/** Terminal anchor offset from the cell centre, as a fraction of `cellSize`. Under 0.5, so both
 * anchors stay inside their own cell. */
export const TERMINAL_OFFSET_RATIO = 0.42

/** Pointer travel, in logical pixels, above which a press becomes a drag rather than a tap. */
export const TAP_SLOP = 6

/** Square cells, centred in the canvas. Never smaller than one pixel. */
export function computeViewport(
  canvas: { width: number; height: number },
  grid: GridSize
): Viewport {
  const usableWidth = canvas.width - 2 * CANVAS_PADDING
  const usableHeight = canvas.height - 2 * CANVAS_PADDING
  const cellSize = Math.max(
    1,
    Math.floor(Math.min(usableWidth / grid.cols, usableHeight / grid.rows))
  )
  return {
    originX: Math.round((canvas.width - cellSize * grid.cols) / 2),
    originY: Math.round((canvas.height - cellSize * grid.rows) / 2),
    cellSize,
    cols: grid.cols,
    rows: grid.rows,
  }
}

/** Centre of a cell, in logical canvas pixels. */
export function cellToPoint(cell: GridCell, viewport: Viewport): Point {
  return {
    x: viewport.originX + (cell.col + 0.5) * viewport.cellSize,
    y: viewport.originY + (cell.row + 0.5) * viewport.cellSize,
  }
}

/**
 * The cell containing a point, or `null` when the point is outside the grid.
 *
 * Fails closed: a point beyond an edge yields `null` rather than the nearest edge cell, so a
 * stray pointer release off the grid can never place a component somewhere the player did not aim.
 */
export function pointToCell(point: Point, viewport: Viewport): GridCell | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null
  }
  const col = Math.floor((point.x - viewport.originX) / viewport.cellSize)
  const row = Math.floor((point.y - viewport.originY) / viewport.cellSize)
  if (col < 0 || row < 0 || col >= viewport.cols || row >= viewport.rows) {
    return null
  }
  return { col, row }
}

/**
 * Undo the CSS scaling of the canvas element.
 *
 * A zero-sized rect happens on the first layout pass, before the element has been measured.
 * Returning a point outside the grid — which `pointToCell` then rejects — avoids a division by
 * zero and keeps the failure mode "nothing happened" instead of "placed at NaN".
 */
export function clientToCanvasPoint(
  client: Point,
  rect: { left: number; top: number; width: number; height: number },
  canvas: { width: number; height: number }
): Point {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: -1, y: -1 }
  }
  return {
    x: (client.x - rect.left) * (canvas.width / rect.width),
    y: (client.y - rect.top) * (canvas.height / rect.height),
  }
}

/**
 * Where terminal 0 or 1 of an element sits on screen.
 *
 * Rotation 0 puts terminal 0 left and terminal 1 right; each 90 degrees turns that pair clockwise.
 * Nothing in this unit emits a rotation other than 0, but all four are handled so that adding a
 * rotate action later is a reducer change with no geometry change.
 */
export function terminalAnchor(
  element: CircuitElement,
  index: 0 | 1,
  viewport: Viewport
): Point {
  const centre = cellToPoint(
    { col: element.position.col, row: element.position.row },
    viewport
  )
  const offset = TERMINAL_OFFSET_RATIO * viewport.cellSize
  switch (element.position.rotation) {
    case 0:
      return { x: centre.x + (index === 0 ? -offset : offset), y: centre.y }
    case 90:
      return { x: centre.x, y: centre.y + (index === 0 ? -offset : offset) }
    case 180:
      return { x: centre.x + (index === 0 ? offset : -offset), y: centre.y }
    default:
      return { x: centre.x, y: centre.y + (index === 0 ? offset : -offset) }
  }
}

/** Shortest distance from a point to the segment `a`-`b`. A degenerate segment is just a point. */
export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y)
  }
  const raw = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
  const t = Math.min(1, Math.max(0, raw))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

function terminalIndexByNode(layout: CircuitLayout): Map<string, { element: CircuitElement; index: 0 | 1 }> {
  const byNode = new Map<string, { element: CircuitElement; index: 0 | 1 }>()
  for (const element of layout.elements) {
    byNode.set(element.terminals[0], { element, index: 0 })
    byNode.set(element.terminals[1], { element, index: 1 })
  }
  return byNode
}

function nearestTerminal(
  point: Point,
  layout: CircuitLayout,
  viewport: Viewport
): HitTarget | null {
  const radius = TERMINAL_HIT_RATIO * viewport.cellSize
  let best: { target: HitTarget; distance: number } | null = null
  for (const element of layout.elements) {
    for (const index of [0, 1] as const) {
      const anchor = terminalAnchor(element, index, viewport)
      const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y)
      if (distance <= radius && (best === null || distance < best.distance)) {
        best = {
          distance,
          target: {
            kind: 'terminal',
            elementId: element.id,
            terminalIndex: index,
            cell: { col: element.position.col, row: element.position.row },
            elementKind: element.kind,
          },
        }
      }
    }
  }
  return best === null ? null : best.target
}

function nearestConnection(
  point: Point,
  layout: CircuitLayout,
  viewport: Viewport
): HitTarget | null {
  const radius = CONNECTION_HIT_RATIO * viewport.cellSize
  const byNode = terminalIndexByNode(layout)
  let best: { connectionId: string; distance: number } | null = null
  for (const connection of layout.connections) {
    const from = byNode.get(connection.from)
    const to = byNode.get(connection.to)
    if (from === undefined || to === undefined) {
      continue
    }
    const distance = distanceToSegment(
      point,
      terminalAnchor(from.element, from.index, viewport),
      terminalAnchor(to.element, to.index, viewport)
    )
    if (distance <= radius && (best === null || distance < best.distance)) {
      best = { connectionId: connection.id, distance }
    }
  }
  return best === null ? null : { kind: 'connection', connectionId: best.connectionId }
}

/**
 * What the player is pointing at.
 *
 * Priority, highest first: terminal, element body, connection, empty cell, outside the grid.
 * Terminals outrank bodies because a terminal always sits on top of a body and connecting is the
 * finer-grained action — the coarser one (selecting or dragging the element) is still reachable
 * everywhere else on the body.
 */
export function hitTest(point: Point, layout: CircuitLayout, viewport: Viewport): HitTarget {
  const terminal = nearestTerminal(point, layout, viewport)
  if (terminal !== null) {
    return terminal
  }

  const cell = pointToCell(point, viewport)
  if (cell !== null) {
    const element = layout.elements.find(
      (candidate) => candidate.position.col === cell.col && candidate.position.row === cell.row
    )
    if (element !== undefined) {
      return { kind: 'element', elementId: element.id, cell, elementKind: element.kind }
    }
  }

  const connection = nearestConnection(point, layout, viewport)
  if (connection !== null) {
    return connection
  }

  return cell === null ? { kind: 'outside' } : { kind: 'cell', cell }
}
