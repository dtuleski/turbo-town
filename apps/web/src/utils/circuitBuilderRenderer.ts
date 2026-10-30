// Circuit Builder — canvas renderer (component C1).
//
// Framework free and stateless: given a context and a scene it draws, and it owns no interaction
// state of its own. That keeps rendering and hit-testing separable by construction rather than by
// convention.
//
// Every visual is driven by the engine's own output. Brightness comes from `ElementResult.intensity`,
// which already carries the engine's gamma curve, so this file never re-derives a brightness from a
// current and never hard-codes one per circuit arrangement.
//
// No text is drawn on the canvas. Components are vector glyphs, so nothing here needs translating
// and the localized copy stays in the DOM where the locale files can reach it.

import { ELEMENT_SPECS } from './circuitEngine'
import type {
  CircuitElement,
  CircuitLayout,
  CircuitResult,
  ElementKind,
  ElementResult,
} from './circuitEngine'
import type { Point, Viewport } from './circuitBuilderGeometry'
import { cellToPoint, terminalAnchor } from './circuitBuilderGeometry'
import type { SelectionState } from './circuitBuilderInteraction'
import type { CircuitBuilderState } from './circuitBuilderState'

export interface RenderScene {
  state: CircuitBuilderState
  /** `null` when the outcome was an evaluation error. The scene then draws fully de-energized. */
  result: CircuitResult | null
  viewport: Viewport
  selection: SelectionState
  timeMs: number
  reducedMotion: boolean
}

const PALETTE = {
  background: '#0b1220',
  gridLine: 'rgba(148, 163, 184, 0.14)',
  gridBorder: 'rgba(148, 163, 184, 0.38)',
  traceIdle: '#64748b',
  traceLive: '#22d3ee',
  bodyIdle: '#17213a',
  bodyLive: '#0b3d4d',
  outlineIdle: '#94a3b8',
  outlineLive: '#67e8f9',
  glyphIdle: '#cbd5e1',
  glyphLive: '#ecfeff',
  selection: '#f8fafc',
  pending: '#fbbf24',
  ghost: 'rgba(34, 211, 238, 0.30)',
  fault: '#f87171',
} as const

/** De-energized stroke width. Energized traces are drawn at `LINE_WIDTH_RATIO` times this, which
 * is the first of four non-colour channels separating the two states. */
const TRACE_WIDTH_IDLE = 2.4
const LINE_WIDTH_RATIO = 1.6

/** Marching-dash pattern for an energized trace. A de-energized trace is solid. */
const DASH_PATTERN: readonly number[] = [10, 6]
const DASH_PERIOD = 16
const DASH_SPEED_MS_PER_PIXEL = 24

const GLOW_BLUR = 14

/**
 * The single documented brightness mapping.
 *
 * `intensity` arrives from the engine already normalized and gamma-corrected; this turns it into
 * the three drawing quantities a load needs. Applied ONLY to kinds that declare a rated current —
 * the engine reports `intensity: 0` for every other kind, so ramping those would render them
 * permanently dark and faking a ramp would be exactly the hard-coding this unit must not do.
 */
export function loadGlow(intensity: number): {
  coreAlpha: number
  glowAlpha: number
  glowRadiusRatio: number
} {
  const safe = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0
  return {
    coreAlpha: 0.35 + 0.65 * safe,
    glowAlpha: 0.25 + 0.75 * safe,
    glowRadiusRatio: 0.18 + 0.42 * safe,
  }
}

/** True only when something is actually moving. The canvas host stops its animation loop on
 * false, so a settled circuit costs nothing per frame. */
export function hasLiveAnimation(scene: RenderScene): boolean {
  if (scene.reducedMotion || scene.state.fuseBlown || scene.result === null) {
    return false
  }
  return scene.result.elements.some((element) => element.energized)
}

function resetContext(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.globalAlpha = 1
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
}

function hasBrightnessRamp(kind: ElementKind): boolean {
  return ELEMENT_SPECS[kind].ratedCurrent !== undefined
}

function drawBackground(ctx: CanvasRenderingContext2D, viewport: Viewport, width: number, height: number): void {
  ctx.fillStyle = PALETTE.background
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = PALETTE.gridLine
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let col = 0; col <= viewport.cols; col += 1) {
    const x = viewport.originX + col * viewport.cellSize + 0.5
    ctx.moveTo(x, viewport.originY)
    ctx.lineTo(x, viewport.originY + viewport.rows * viewport.cellSize)
  }
  for (let row = 0; row <= viewport.rows; row += 1) {
    const y = viewport.originY + row * viewport.cellSize + 0.5
    ctx.moveTo(viewport.originX, y)
    ctx.lineTo(viewport.originX + viewport.cols * viewport.cellSize, y)
  }
  ctx.stroke()

  ctx.strokeStyle = PALETTE.gridBorder
  ctx.lineWidth = 2
  ctx.strokeRect(
    viewport.originX,
    viewport.originY,
    viewport.cols * viewport.cellSize,
    viewport.rows * viewport.cellSize
  )
  resetContext(ctx)
}

/** Static direction glyphs along a trace, substituting for the marching dashes when motion is
 * reduced. The channel is replaced, never dropped. */
function drawChevrons(ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length < size) {
    return
  }
  const ux = dx / length
  const uy = dy / length
  const arm = size * 0.26
  ctx.strokeStyle = PALETTE.glyphLive
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (let distance = size * 0.5; distance < length; distance += size) {
    const x = from.x + ux * distance
    const y = from.y + uy * distance
    ctx.moveTo(x - ux * arm - uy * arm, y - uy * arm + ux * arm)
    ctx.lineTo(x, y)
    ctx.lineTo(x - ux * arm + uy * arm, y - uy * arm - ux * arm)
  }
  ctx.stroke()
  resetContext(ctx)
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  energized: boolean,
  scene: RenderScene
): void {
  ctx.lineCap = 'round'
  if (energized) {
    ctx.strokeStyle = PALETTE.traceLive
    ctx.lineWidth = TRACE_WIDTH_IDLE * LINE_WIDTH_RATIO
    ctx.shadowBlur = GLOW_BLUR
    ctx.shadowColor = PALETTE.traceLive
    ctx.setLineDash([...DASH_PATTERN])
    ctx.lineDashOffset = scene.reducedMotion
      ? 0
      : -((scene.timeMs / DASH_SPEED_MS_PER_PIXEL) % DASH_PERIOD)
  } else {
    ctx.strokeStyle = PALETTE.traceIdle
    ctx.lineWidth = TRACE_WIDTH_IDLE
    ctx.setLineDash([])
  }
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  resetContext(ctx)

  if (energized && scene.reducedMotion) {
    drawChevrons(ctx, from, to, scene.viewport.cellSize * 0.5)
  }
}

function terminalLookup(layout: CircuitLayout): Map<string, { element: CircuitElement; index: 0 | 1 }> {
  const byNode = new Map<string, { element: CircuitElement; index: 0 | 1 }>()
  for (const element of layout.elements) {
    byNode.set(element.terminals[0], { element, index: 0 })
    byNode.set(element.terminals[1], { element, index: 1 })
  }
  return byNode
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  resultsById: Map<string, ElementResult>,
  suppressed: boolean
): void {
  const byNode = terminalLookup(scene.state.layout)
  for (const connection of scene.state.layout.connections) {
    const from = byNode.get(connection.from)
    const to = byNode.get(connection.to)
    if (from === undefined || to === undefined) {
      continue
    }
    // A connection is live only when both of the elements it joins are live. A wire reports no
    // individually determined current under the model, so `energized` is the only usable signal.
    const energized =
      !suppressed &&
      resultsById.get(from.element.id)?.energized === true &&
      resultsById.get(to.element.id)?.energized === true
    drawTrace(
      ctx,
      terminalAnchor(from.element, from.index, scene.viewport),
      terminalAnchor(to.element, to.index, scene.viewport),
      energized,
      scene
    )
  }
}

function drawTerminals(
  ctx: CanvasRenderingContext2D,
  element: CircuitElement,
  viewport: Viewport,
  energized: boolean
): void {
  const radius = Math.max(2, viewport.cellSize * 0.07)
  for (const index of [0, 1] as const) {
    const anchor = terminalAnchor(element, index, viewport)
    ctx.beginPath()
    ctx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = energized ? PALETTE.outlineLive : PALETTE.outlineIdle
    ctx.fill()
  }
  resetContext(ctx)
}

function drawKindGlyph(
  ctx: CanvasRenderingContext2D,
  element: CircuitElement,
  centre: Point,
  size: number,
  energized: boolean,
  intensity: number,
  scene: RenderScene
): void {
  const kind: ElementKind = element.kind
  const stroke = energized ? PALETTE.glyphLive : PALETTE.glyphIdle
  ctx.strokeStyle = stroke
  ctx.fillStyle = stroke
  ctx.lineWidth = Math.max(1.4, size * 0.07)
  ctx.lineCap = 'round'
  const half = size * 0.5

  switch (kind) {
    case 'battery': {
      ctx.beginPath()
      ctx.moveTo(centre.x - half * 0.3, centre.y - half * 0.7)
      ctx.lineTo(centre.x - half * 0.3, centre.y + half * 0.7)
      ctx.moveTo(centre.x + half * 0.3, centre.y - half * 0.35)
      ctx.lineTo(centre.x + half * 0.3, centre.y + half * 0.35)
      ctx.stroke()
      break
    }
    case 'solar': {
      ctx.strokeRect(centre.x - half * 0.75, centre.y - half * 0.5, size * 0.75, size * 0.5)
      ctx.beginPath()
      ctx.moveTo(centre.x, centre.y - half * 0.5)
      ctx.lineTo(centre.x, centre.y + half * 0.5)
      ctx.moveTo(centre.x - half * 0.75, centre.y)
      ctx.lineTo(centre.x + half * 0.75, centre.y)
      ctx.stroke()
      break
    }
    case 'wire': {
      ctx.beginPath()
      ctx.moveTo(centre.x - half * 0.8, centre.y)
      ctx.lineTo(centre.x + half * 0.8, centre.y)
      ctx.stroke()
      break
    }
    case 'switch': {
      // An absent entry means open, matching the engine's fail-closed default.
      const closed = scene.state.switches[element.id] === 'closed'
      ctx.beginPath()
      ctx.moveTo(centre.x - half * 0.8, centre.y)
      ctx.lineTo(centre.x - half * 0.3, centre.y)
      ctx.moveTo(centre.x + half * 0.3, centre.y)
      ctx.lineTo(centre.x + half * 0.8, centre.y)
      ctx.moveTo(centre.x - half * 0.3, centre.y)
      ctx.lineTo(
        closed ? centre.x + half * 0.3 : centre.x + half * 0.2,
        closed ? centre.y : centre.y - half * 0.55
      )
      ctx.stroke()
      break
    }
    case 'resistor': {
      ctx.beginPath()
      ctx.moveTo(centre.x - half * 0.8, centre.y)
      const steps = 6
      const span = size * 0.9
      for (let step = 0; step < steps; step += 1) {
        const x = centre.x - half * 0.8 + ((step + 0.5) * span) / steps
        ctx.lineTo(x, centre.y + (step % 2 === 0 ? -half * 0.4 : half * 0.4))
      }
      ctx.lineTo(centre.x + half * 0.8, centre.y)
      ctx.stroke()
      break
    }
    case 'led': {
      const glow = loadGlow(intensity)
      if (energized) {
        ctx.globalAlpha = glow.glowAlpha
        ctx.beginPath()
        ctx.arc(centre.x, centre.y, size * glow.glowRadiusRatio, 0, Math.PI * 2)
        ctx.fillStyle = PALETTE.traceLive
        ctx.fill()
        ctx.globalAlpha = glow.coreAlpha
      } else {
        // Hollow ring instead of a filled halo: the fourth non-colour channel.
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(centre.x, centre.y, size * 0.22, 0, Math.PI * 2)
        ctx.strokeStyle = PALETTE.outlineIdle
        ctx.stroke()
      }
      ctx.strokeStyle = stroke
      ctx.beginPath()
      ctx.moveTo(centre.x - half * 0.35, centre.y - half * 0.45)
      ctx.lineTo(centre.x - half * 0.35, centre.y + half * 0.45)
      ctx.lineTo(centre.x + half * 0.3, centre.y)
      ctx.closePath()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centre.x + half * 0.3, centre.y - half * 0.45)
      ctx.lineTo(centre.x + half * 0.3, centre.y + half * 0.45)
      ctx.stroke()
      break
    }
    case 'motor': {
      const glow = loadGlow(intensity)
      ctx.beginPath()
      ctx.arc(centre.x, centre.y, size * 0.3, 0, Math.PI * 2)
      ctx.stroke()
      if (energized) {
        ctx.globalAlpha = glow.glowAlpha
        ctx.beginPath()
        ctx.arc(centre.x, centre.y, size * glow.glowRadiusRatio, 0, Math.PI * 2)
        ctx.fillStyle = PALETTE.traceLive
        ctx.fill()
        ctx.globalAlpha = glow.coreAlpha
      }
      // Rotor angle advances with intensity: a faster-spinning motor is carrying more current.
      const angle = scene.reducedMotion ? 0 : (scene.timeMs * 0.004 * Math.max(0.0, intensity)) % (Math.PI * 2)
      ctx.strokeStyle = stroke
      ctx.beginPath()
      ctx.moveTo(centre.x - Math.cos(angle) * size * 0.26, centre.y - Math.sin(angle) * size * 0.26)
      ctx.lineTo(centre.x + Math.cos(angle) * size * 0.26, centre.y + Math.sin(angle) * size * 0.26)
      ctx.stroke()
      break
    }
    default: {
      // Buzzer: concentric rings, one more ring the louder it is.
      const rings = energized ? 1 + Math.round(Math.min(1, Math.max(0, intensity)) * 3) : 1
      const glow = loadGlow(intensity)
      ctx.globalAlpha = energized ? glow.coreAlpha : 1
      for (let ring = 0; ring < rings; ring += 1) {
        ctx.beginPath()
        ctx.arc(centre.x, centre.y, size * (0.12 + ring * 0.07), 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }
  }
  resetContext(ctx)
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: CircuitElement,
  scene: RenderScene,
  result: ElementResult | undefined,
  suppressed: boolean
): void {
  const viewport = scene.viewport
  const centre = cellToPoint(
    { col: element.position.col, row: element.position.row },
    viewport
  )
  const energized = !suppressed && result?.energized === true
  // Only kinds the engine rates get a ramp. Everything else is a binary treatment.
  const intensity =
    !suppressed && hasBrightnessRamp(element.kind) && result !== undefined ? result.intensity : 0
  const size = viewport.cellSize * 0.78
  const radius = Math.max(4, viewport.cellSize * 0.16)

  ctx.beginPath()
  ctx.roundRect(centre.x - size / 2, centre.y - size / 2, size, size, radius)
  ctx.fillStyle = energized ? PALETTE.bodyLive : PALETTE.bodyIdle
  ctx.fill()
  ctx.lineWidth = energized ? TRACE_WIDTH_IDLE * LINE_WIDTH_RATIO : TRACE_WIDTH_IDLE
  ctx.strokeStyle = energized ? PALETTE.outlineLive : PALETTE.outlineIdle
  if (energized) {
    ctx.shadowBlur = GLOW_BLUR
    ctx.shadowColor = PALETTE.traceLive
  }
  ctx.stroke()
  resetContext(ctx)

  drawKindGlyph(ctx, element, centre, size, energized, intensity, scene)
  drawTerminals(ctx, element, viewport, energized)
}

function drawAffordances(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
  const viewport = scene.viewport
  const selection = scene.selection

  if (selection.armedKind !== null) {
    const ghostCell = selection.drag?.overCell ?? selection.cursor
    const centre = cellToPoint(ghostCell, viewport)
    const size = viewport.cellSize * 0.78
    ctx.fillStyle = PALETTE.ghost
    ctx.beginPath()
    ctx.roundRect(
      centre.x - size / 2,
      centre.y - size / 2,
      size,
      size,
      Math.max(4, viewport.cellSize * 0.16)
    )
    ctx.fill()
    resetContext(ctx)
  }

  const cursorCentre = cellToPoint(selection.cursor, viewport)
  ctx.strokeStyle = PALETTE.selection
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.strokeRect(
    cursorCentre.x - viewport.cellSize / 2,
    cursorCentre.y - viewport.cellSize / 2,
    viewport.cellSize,
    viewport.cellSize
  )
  resetContext(ctx)

  if (selection.selectedElementId !== null) {
    const selected = scene.state.layout.elements.find(
      (element) => element.id === selection.selectedElementId
    )
    if (selected !== undefined) {
      const centre = cellToPoint(
        { col: selected.position.col, row: selected.position.row },
        viewport
      )
      ctx.strokeStyle = PALETTE.selection
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centre.x, centre.y, viewport.cellSize * 0.46, 0, Math.PI * 2)
      ctx.stroke()
      resetContext(ctx)
    }
  }

  const pending = selection.pendingTerminal
  if (pending !== null) {
    const element = scene.state.layout.elements.find(
      (candidate) => candidate.id === pending.elementId
    )
    if (element !== undefined) {
      const anchor = terminalAnchor(element, pending.terminalIndex, viewport)
      ctx.strokeStyle = PALETTE.pending
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(anchor.x, anchor.y, viewport.cellSize * 0.18, 0, Math.PI * 2)
      ctx.stroke()
      if (selection.drag !== null) {
        ctx.beginPath()
        ctx.moveTo(anchor.x, anchor.y)
        ctx.lineTo(selection.drag.at.x, selection.drag.at.y)
        ctx.stroke()
      }
      resetContext(ctx)
    }
  }
}

/** A broken-ring badge, drawn as a shape so it needs no translation. */
function drawFuseBadge(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  const x = viewport.originX + viewport.cols * viewport.cellSize - 26
  const y = viewport.originY + 22
  ctx.strokeStyle = PALETTE.fault
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, 12, 0.6, Math.PI * 2 - 0.6)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 7, y + 7)
  ctx.lineTo(x + 7, y - 7)
  ctx.stroke()
  resetContext(ctx)
}

/**
 * Draw one frame.
 *
 * `fuseBlown` suppresses energization HERE rather than in the engine or in the layout, so the
 * circuit the player built stays submittable and unmodified and clearing the fuse is a one-field
 * change with nothing to recompute.
 */
export function drawScene(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
  const viewport = scene.viewport
  const width = viewport.originX * 2 + viewport.cols * viewport.cellSize
  const height = viewport.originY * 2 + viewport.rows * viewport.cellSize

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  drawBackground(ctx, viewport, Math.max(width, ctx.canvas.width), Math.max(height, ctx.canvas.height))

  const suppressed = scene.state.fuseBlown || scene.result === null
  const resultsById = new Map<string, ElementResult>()
  if (scene.result !== null) {
    for (const element of scene.result.elements) {
      resultsById.set(element.elementId, element)
    }
  }

  drawConnections(ctx, scene, resultsById, suppressed)
  for (const element of scene.state.layout.elements) {
    drawElement(ctx, element, scene, resultsById.get(element.id), suppressed)
  }
  drawAffordances(ctx, scene)
  if (scene.state.fuseBlown) {
    drawFuseBadge(ctx, viewport)
  }
  resetContext(ctx)
}
