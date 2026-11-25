import { describe, expect, it } from 'vitest'
import { connectTerminals, createElement, createLayout } from '../circuitEngine'
import type { CircuitElement, CircuitLayout, Connection, ElementKind } from '../circuitEngine'
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  PART_BODY_RATIO,
  cellToPoint,
  computeViewport,
  distanceToSegment,
  hitTest,
  routeConnection,
  sampleConnectionPath,
  terminalAnchor,
} from '../circuitBuilderGeometry'
import type { ConnectionPath, Point, Viewport } from '../circuitBuilderGeometry'
import { mustLevel } from './circuitTestLayouts'

const level = mustLevel('cb-01-closed-circuit')
const viewport = computeViewport(
  { width: CIRCUIT_CANVAS_WIDTH, height: CIRCUIT_CANVAS_HEIGHT },
  level.gridSize
)

function part(id: string, kind: ElementKind, col: number, row: number): CircuitElement {
  return createElement(kind, { id, position: { col, row, rotation: 0 } })
}

function endOf(layout: CircuitLayout, node: string) {
  for (const element of layout.elements) {
    const index = element.terminals.indexOf(node)
    if (index === 0 || index === 1) {
      return { element, index: index as 0 | 1 }
    }
  }
  throw new Error(`no terminal ${node}`)
}

function route(layout: CircuitLayout, connection: Connection, at: Viewport = viewport): ConnectionPath {
  return routeConnection(
    endOf(layout, connection.from),
    endOf(layout, connection.to),
    layout.elements,
    at
  )
}

/** True when the point lies inside a drawn part body (the square the renderer fills). */
function insideAnyBody(point: Point, layout: CircuitLayout, at: Viewport = viewport): boolean {
  const half = (PART_BODY_RATIO / 2) * at.cellSize
  return layout.elements.some((element) => {
    const centre = cellToPoint(element.position, at)
    return Math.abs(point.x - centre.x) < half && Math.abs(point.y - centre.y) < half
  })
}

function distanceToPath(point: Point, path: ConnectionPath): number {
  const points = sampleConnectionPath(path)
  let best = Number.POSITIVE_INFINITY
  for (let index = 1; index < points.length; index += 1) {
    best = Math.min(best, distanceToSegment(point, points[index - 1], points[index]))
  }
  return best
}

// The owner's cb-01 board: battery, resistor and LED in one row, wired battery-left to
// resistor-left, resistor-right to LED-left, LED-right to battery-right. A valid loop, but drawn
// straight the LED-right link ran behind the LED and on top of the other two links.
const BATTERY_TO_RESISTOR = connectTerminals('e1:0', 'e2:0')
const RESISTOR_TO_LED = connectTerminals('e2:1', 'e3:0')
const LED_TO_BATTERY = connectTerminals('e3:1', 'e1:1')
const OWNER_LAYOUT = createLayout(
  [part('e1', 'battery', 1, 2), part('e2', 'resistor', 3, 2), part('e3', 'led', 5, 2)],
  [BATTERY_TO_RESISTOR, RESISTOR_TO_LED, LED_TO_BATTERY],
  level.gridSize
)

describe('routeConnection on the owner cb-01 layout', () => {
  it('ends every link exactly on the two dots it joins', () => {
    for (const connection of OWNER_LAYOUT.connections) {
      const path = route(OWNER_LAYOUT, connection)
      const from = endOf(OWNER_LAYOUT, connection.from)
      const to = endOf(OWNER_LAYOUT, connection.to)
      expect(path.from).toEqual(terminalAnchor(from.element, from.index, viewport))
      expect(path.to).toEqual(terminalAnchor(to.element, to.index, viewport))
    }
  })

  it('bends the LED-right to battery-right link so it crosses no part body', () => {
    const path = route(OWNER_LAYOUT, LED_TO_BATTERY)
    expect(path.kind).toBe('curve')
    for (const point of sampleConnectionPath(path)) {
      expect(insideAnyBody(point, OWNER_LAYOUT)).toBe(false)
    }
  })

  it('bends the battery-left to resistor-left link around the battery', () => {
    const path = route(OWNER_LAYOUT, BATTERY_TO_RESISTOR)
    expect(path.kind).toBe('curve')
    for (const point of sampleConnectionPath(path)) {
      expect(insideAnyBody(point, OWNER_LAYOUT)).toBe(false)
    }
  })

  it('keeps a link that crosses nothing straight', () => {
    expect(route(OWNER_LAYOUT, RESISTOR_TO_LED).kind).toBe('line')
  })

  it('keeps the LED-right link visibly apart from the other two links', () => {
    const own = sampleConnectionPath(route(OWNER_LAYOUT, LED_TO_BATTERY))
    const middle = own[Math.floor(own.length / 2)]
    for (const other of [BATTERY_TO_RESISTOR, RESISTOR_TO_LED]) {
      expect(distanceToPath(middle, route(OWNER_LAYOUT, other))).toBeGreaterThan(viewport.cellSize * 0.25)
    }
  })

  it('hit-tests the link where it is drawn', () => {
    const own = sampleConnectionPath(route(OWNER_LAYOUT, LED_TO_BATTERY))
    const middle = own[Math.floor(own.length / 2)]
    expect(hitTest(middle, OWNER_LAYOUT, viewport)).toEqual({
      kind: 'connection',
      connectionId: LED_TO_BATTERY.id,
    })
  })
})

describe('routeConnection at the grid edge', () => {
  it('bows into the grid when the row sits on the top edge', () => {
    const layout = createLayout(
      [part('e1', 'battery', 1, 0), part('e2', 'resistor', 3, 0), part('e3', 'led', 5, 0)],
      [connectTerminals('e3:1', 'e1:1')],
      level.gridSize
    )
    const path = route(layout, layout.connections[0])
    expect(path.kind).toBe('curve')
    for (const point of sampleConnectionPath(path)) {
      expect(point.y).toBeGreaterThanOrEqual(viewport.originY)
      expect(insideAnyBody(point, layout)).toBe(false)
    }
  })
})
