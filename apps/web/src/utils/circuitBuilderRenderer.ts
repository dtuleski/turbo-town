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
// Components are vector glyphs. The only text on the canvas is the + and - polarity marks and the
// short part captions; the captions arrive already localized through the scene, so nothing here owns
// any copy.
//
// Connections are drawn ABOVE the parts, each with a dark halo and an end-cap on both of its dots, and
// along `routeConnection`'s path, which bends around any part body a straight line would cross. A
// line hidden behind a part, or lying on top of another link, made a correctly wired dot look
// unconnected.

import { ELEMENT_SPECS } from './circuitEngine'
import { isConnectionEnergized } from './circuitPresentation'
import type {
  CircuitElement,
  CircuitLayout,
  CircuitResult,
  ElementKind,
  ElementResult,
} from './circuitEngine'
import type { ConnectionPath, Point, Viewport } from './circuitBuilderGeometry'
import {
  PART_BODY_RATIO,
  TERMINAL_HIT_RATIO,
  cellToPoint,
  routeConnection,
  sampleConnectionPath,
  terminalAnchor,
} from './circuitBuilderGeometry'
import { connectionTargets, partCaption, polarityMarks } from './circuitBuilderAffordances'
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
  /** Localized short part names (the component.*.abbr keys). Omitted means no captions. */
  captions?: Readonly<Partial<Record<ElementKind, string>>>
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
  plus: '#fca5a5',
  minus: '#93c5fd',
  caption: '#cbd5e1',
  target: '#67e8f9',
  halo: '#0b1220',
} as const

/** Extra width of the dark outline under every trace, so a trace reads on top of a part glyph. */
const TRACE_HALO_EXTRA = 3

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

/**
 * Whether an element is drawn lit. Glow is the engine's own verdict for that element and nothing
 * else: a part touching a live node but carrying no current of its own (a bypassed or
 * half-connected LED) is NOT lit. Never derive this from the nodes a part is attached to.
 */
export function isGlowing(result: ElementResult | undefined): boolean {
  return result?.energized === true
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
 * reduced. The channel is replaced, never dropped. Walks the polyline, so a curved trace gets
 * its chevrons along the curve. */
function drawChevrons(ctx: CanvasRenderingContext2D, points: readonly Point[], size: number): void {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }
  if (total < size) {
    return
  }
  const arm = size * 0.26
  ctx.strokeStyle = PALETTE.glyphLive
  ctx.lineWidth = 1.6
  ctx.beginPath()
  let next = size * 0.5
  let walked = 0
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const dx = points[index].x - from.x
    const dy = points[index].y - from.y
    const length = Math.hypot(dx, dy)
    if (length === 0) {
      continue
    }
    const ux = dx / length
    const uy = dy / length
    while (next < walked + length) {
      const x = from.x + ux * (next - walked)
      const y = from.y + uy * (next - walked)
      ctx.moveTo(x - ux * arm - uy * arm, y - uy * arm + ux * arm)
      ctx.lineTo(x, y)
      ctx.lineTo(x - ux * arm + uy * arm, y - uy * arm - ux * arm)
      next += size
    }
    walked += length
  }
  ctx.stroke()
  resetContext(ctx)
}

function tracePath(ctx: CanvasRenderingContext2D, path: ConnectionPath): void {
  ctx.beginPath()
  ctx.moveTo(path.from.x, path.from.y)
  if (path.kind === 'curve') {
    ctx.bezierCurveTo(path.c1.x, path.c1.y, path.c2.x, path.c2.y, path.to.x, path.to.y)
  } else {
    ctx.lineTo(path.to.x, path.to.y)
  }
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  path: ConnectionPath,
  energized: boolean,
  scene: RenderScene
): void {
  ctx.lineCap = 'round'
  // The halo first: a solid dark outline that separates the trace from whatever part it crosses.
  ctx.strokeStyle = PALETTE.halo
  ctx.lineWidth = TRACE_WIDTH_IDLE * (energized ? LINE_WIDTH_RATIO : 1) + TRACE_HALO_EXTRA
  tracePath(ctx, path)
  ctx.stroke()

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
  tracePath(ctx, path)
  ctx.stroke()
  resetContext(ctx)

  if (energized && scene.reducedMotion) {
    drawChevrons(ctx, sampleConnectionPath(path), scene.viewport.cellSize * 0.5)
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

/** Draws every connection and returns the dots they end on, each marked live when any link that
 * ends there is live. */
function drawConnections(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  resultsById: Map<string, ElementResult>,
  suppressed: boolean
): Map<string, { at: Point; energized: boolean }> {
  const byNode = terminalLookup(scene.state.layout)
  const caps = new Map<string, { at: Point; energized: boolean }>()
  for (const connection of scene.state.layout.connections) {
    const from = byNode.get(connection.from)
    const to = byNode.get(connection.to)
    if (from === undefined || to === undefined) {
      continue
    }
    // A connection is live only when both of the elements it joins are live. A wire reports no
    // individually determined current under the model, so `energized` is the only usable signal.
    const energized = isConnectionEnergized(
      resultsById.get(from.element.id),
      resultsById.get(to.element.id),
      suppressed
    )
    const path = routeConnection(from, to, scene.state.layout.elements, scene.viewport)
    drawTrace(ctx, path, energized, scene)
    for (const [node, at] of [
      [connection.from, path.from],
      [connection.to, path.to],
    ] as const) {
      caps.set(node, { at, energized: energized || caps.get(node)?.energized === true })
    }
  }
  return caps
}

/** A small filled cap on every dot a connection ends on, drawn last so a linked dot is always
 * visibly different from a free one. */
function drawEndCaps(
  ctx: CanvasRenderingContext2D,
  caps: Map<string, { at: Point; energized: boolean }>,
  viewport: Viewport
): void {
  const radius = Math.max(2, viewport.cellSize * 0.05)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = PALETTE.halo
  for (const cap of caps.values()) {
    ctx.beginPath()
    ctx.arc(cap.at.x, cap.at.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = cap.energized ? PALETTE.traceLive : PALETTE.traceIdle
    ctx.fill()
    ctx.stroke()
  }
  resetContext(ctx)
}

function drawTerminals(
  ctx: CanvasRenderingContext2D,
  element: CircuitElement,
  viewport: Viewport,
  energized: boolean
): void {
  const radius = Math.max(3, viewport.cellSize * 0.1)
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
  const energized = !suppressed && isGlowing(result)
  // Only kinds the engine rates get a ramp. Everything else is a binary treatment.
  const intensity =
    !suppressed && hasBrightnessRamp(element.kind) && result !== undefined ? result.intensity : 0
  const size = viewport.cellSize * PART_BODY_RATIO
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
  drawLabels(ctx, element, centre, scene)
}

/** + and - beside the terminals of sources and the LED, and a short caption under the glyph. Text
 * is skipped on very small cells, where it would only be noise. */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  element: CircuitElement,
  centre: Point,
  scene: RenderScene
): void {
  const cell = scene.viewport.cellSize
  if (cell < 30) {
    return
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const marks = polarityMarks(element.kind)
  if (marks !== null) {
    ctx.font = `bold ${Math.round(cell * 0.24)}px system-ui, sans-serif`
    for (const index of [0, 1] as const) {
      const anchor = terminalAnchor(element, index, scene.viewport)
      ctx.fillStyle = index === 0 ? PALETTE.plus : PALETTE.minus
      ctx.fillText(marks[index], centre.x + (anchor.x - centre.x) * 0.72, centre.y + (anchor.y - centre.y) * 0.72 - cell * 0.25)
    }
  }
  const abbr = scene.captions?.[element.kind]
  if (abbr !== undefined) {
    ctx.font = `600 ${Math.max(9, Math.round(cell * 0.15))}px system-ui, sans-serif`
    ctx.fillStyle = PALETTE.caption
    ctx.fillText(partCaption(element.kind, abbr), centre.x, centre.y + cell * 0.29)
  }
  resetContext(ctx)
}

function drawAffordances(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
  const viewport = scene.viewport
  const selection = scene.selection

  if (selection.armedKind !== null) {
    const ghostCell = selection.drag?.overCell ?? selection.cursor
    const centre = cellToPoint(ghostCell, viewport)
    const size = viewport.cellSize * PART_BODY_RATIO
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
    drawPendingLink(ctx, scene, pending)
  }
}

/** The half-made link: a ring on the pressed dot, a ring on every dot it could join, and a line
 * following the pointer. The dot under the pointer gets a thicker ring so the drop target is clear. */
function drawPendingLink(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  pending: NonNullable<SelectionState['pendingTerminal']>
): void {
  const viewport = scene.viewport
  const element = scene.state.layout.elements.find((candidate) => candidate.id === pending.elementId)
  if (element === undefined) {
    return
  }
  const anchor = terminalAnchor(element, pending.terminalIndex, viewport)
  const pointer = scene.selection.pointer ?? scene.selection.drag?.at ?? null

  const grab = TERMINAL_HIT_RATIO * viewport.cellSize
  for (const target of connectionTargets(scene.state.layout, pending)) {
    const owner = scene.state.layout.elements.find((candidate) => candidate.id === target.elementId)
    if (owner === undefined) {
      continue
    }
    const spot = terminalAnchor(owner, target.terminalIndex, viewport)
    const hovered = pointer !== null && Math.hypot(pointer.x - spot.x, pointer.y - spot.y) <= grab
    ctx.strokeStyle = PALETTE.target
    ctx.lineWidth = hovered ? 3.5 : 1.8
    ctx.globalAlpha = hovered ? 1 : 0.75
    ctx.beginPath()
    ctx.arc(spot.x, spot.y, viewport.cellSize * (hovered ? 0.2 : 0.16), 0, Math.PI * 2)
    ctx.stroke()
  }
  resetContext(ctx)

  ctx.strokeStyle = PALETTE.pending
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(anchor.x, anchor.y, viewport.cellSize * 0.18, 0, Math.PI * 2)
  ctx.stroke()
  if (pointer !== null) {
    ctx.lineCap = 'round'
    ctx.setLineDash([8, 6])
    ctx.beginPath()
    ctx.moveTo(anchor.x, anchor.y)
    ctx.lineTo(pointer.x, pointer.y)
    ctx.stroke()
  }
  resetContext(ctx)
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

  for (const element of scene.state.layout.elements) {
    drawElement(ctx, element, scene, resultsById.get(element.id), suppressed)
  }
  // Above the parts, never behind them, so every link visibly reaches the dot it is attached to.
  const caps = drawConnections(ctx, scene, resultsById, suppressed)
  drawEndCaps(ctx, caps, viewport)
  drawAffordances(ctx, scene)
  if (scene.state.fuseBlown) {
    drawFuseBadge(ctx, viewport)
  }
  resetContext(ctx)
}
