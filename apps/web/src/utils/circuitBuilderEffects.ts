// Circuit Builder — particle and feedback effects (component C3).
//
// A framework-free simulation so it can be unit-tested with no DOM. It reads no clock: `update`
// receives a delta and the expiry of a static mark is driven by accumulated time, which makes a
// run reproducible. Randomness is injectable for the same reason.
//
// Memory is bounded by construction: the particle pool is pre-allocated once and an emit beyond
// capacity overwrites the oldest particle rather than growing the array, so a player who causes a
// hundred shorts in a row costs the same as one.

import type { GridPosition, GridSize } from './circuitEngine'
import type { GridCell, Viewport } from './circuitBuilderGeometry'
import { cellToPoint } from './circuitBuilderGeometry'

export const PARTICLE_CAPACITY = 240

/** Particles per spark burst, before the intensity scaling. */
const SPARKS_MIN = 18
const SPARKS_MAX = 24

const SPARK_LIFE_MIN_MS = 420
const SPARK_LIFE_MAX_MS = 620

/** Cells per millisecond. Over a 500 ms life a spark travels under one cell. */
const SPARK_SPEED_MIN = 0.0008
const SPARK_SPEED_MAX = 0.0022

/** Cells per millisecond squared. */
const GRAVITY = 0.0000035

/** How long a reduced-motion substitute mark stays on screen. */
export const STATIC_MARK_DURATION_MS = 1600

/** Sentinel cell meaning "the whole canvas" — used by the celebration substitute, which has no
 * single position. */
const CANVAS_WIDE_CELL: GridCell = { col: -1, row: -1 }

const PALETTE = {
  spark: '#fbbf24',
  fuse: '#f87171',
  celebration: '#22d3ee',
} as const

export interface StaticMark {
  cell: GridCell
  kind: 'spark' | 'fuse' | 'celebration'
  expiresAtMs: number
}

/** The five methods a host needs. `CircuitEffects` implements it; the effects canvas exposes it. */
export interface CircuitEffectsHandle {
  emitSparks: (at: GridPosition, intensity: number) => void
  playFusePop: (at: GridPosition) => void
  playCelebration: () => void
  setReducedMotion: (enabled: boolean) => void
  clear: () => void
}

interface Particle {
  alive: boolean
  /** Fractional grid coordinates, so the simulation is independent of the viewport. */
  col: number
  row: number
  velocityCol: number
  velocityRow: number
  bornAtMs: number
  expiresAtMs: number
  colour: string
  size: number
}

function emptyParticle(): Particle {
  return {
    alive: false,
    col: 0,
    row: 0,
    velocityCol: 0,
    velocityRow: 0,
    bornAtMs: 0,
    expiresAtMs: 0,
    colour: PALETTE.spark,
    size: 1,
  }
}

export class CircuitEffects implements CircuitEffectsHandle {
  private readonly pool: Particle[]
  private readonly random: () => number
  private cursor = 0
  private liveCount = 0
  private elapsedMs = 0
  private reducedMotion = false
  private marks: StaticMark[] = []
  private grid: GridSize = { cols: 24, rows: 16 }

  constructor(random: () => number = Math.random) {
    this.random = random
    this.pool = Array.from({ length: PARTICLE_CAPACITY }, emptyParticle)
  }

  /** The grid the celebration spreads itself across. Nothing else needs it. */
  setGridSize(grid: GridSize): void {
    this.grid = grid
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled
    if (enabled) {
      this.retireAll()
    }
  }

  get active(): boolean {
    return this.liveCount > 0 || this.marks.length > 0
  }

  get activeParticleCount(): number {
    return this.liveCount
  }

  get staticMarks(): readonly StaticMark[] {
    return this.marks
  }

  emitSparks(at: GridPosition, intensity: number): void {
    const scale = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0
    if (this.reducedMotion) {
      this.pushMark({ col: at.col, row: at.row }, 'spark')
      return
    }
    const count = Math.round(SPARKS_MIN + (SPARKS_MAX - SPARKS_MIN) * scale)
    this.burst({ col: at.col, row: at.row }, count, PALETTE.spark, 1 + scale)
  }

  playFusePop(at: GridPosition): void {
    if (this.reducedMotion) {
      this.pushMark({ col: at.col, row: at.row }, 'fuse')
      return
    }
    this.burst({ col: at.col, row: at.row }, SPARKS_MAX, PALETTE.fuse, 1.6)
  }

  playCelebration(): void {
    if (this.reducedMotion) {
      this.pushMark(CANVAS_WIDE_CELL, 'celebration')
      return
    }
    const origins: GridCell[] = [
      { col: 0, row: 0 },
      { col: this.grid.cols - 1, row: 0 },
      { col: Math.floor(this.grid.cols / 2), row: Math.floor(this.grid.rows / 2) },
      { col: 0, row: this.grid.rows - 1 },
      { col: this.grid.cols - 1, row: this.grid.rows - 1 },
    ]
    for (const origin of origins) {
      this.burst(origin, 12, PALETTE.celebration, 1.3)
    }
  }

  clear(): void {
    this.retireAll()
    this.marks = []
    this.elapsedMs = 0
  }

  /** Advance the simulation. Pure arithmetic: no canvas, no clock, no DOM. */
  update(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
      return
    }
    this.elapsedMs += deltaMs

    for (const particle of this.pool) {
      if (!particle.alive) {
        continue
      }
      if (particle.expiresAtMs <= this.elapsedMs) {
        particle.alive = false
        this.liveCount -= 1
        continue
      }
      particle.velocityRow += GRAVITY * deltaMs
      particle.col += particle.velocityCol * deltaMs
      particle.row += particle.velocityRow * deltaMs
    }

    if (this.marks.length > 0) {
      this.marks = this.marks.filter((mark) => mark.expiresAtMs > this.elapsedMs)
    }
  }

  draw(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
    for (const mark of this.marks) {
      this.drawMark(ctx, mark, viewport)
    }
    for (const particle of this.pool) {
      if (!particle.alive) {
        continue
      }
      const life = particle.expiresAtMs - particle.bornAtMs
      const remaining = life <= 0 ? 0 : (particle.expiresAtMs - this.elapsedMs) / life
      const point = cellToPoint({ col: particle.col, row: particle.row }, viewport)
      ctx.globalAlpha = Math.min(1, Math.max(0, remaining))
      ctx.fillStyle = particle.colour
      ctx.beginPath()
      ctx.arc(point.x, point.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawMark(ctx: CanvasRenderingContext2D, mark: StaticMark, viewport: Viewport): void {
    const colour =
      mark.kind === 'spark'
        ? PALETTE.spark
        : mark.kind === 'fuse'
          ? PALETTE.fuse
          : PALETTE.celebration
    ctx.strokeStyle = colour
    ctx.lineWidth = 3
    if (mark.cell.col < 0 || mark.cell.row < 0) {
      ctx.strokeRect(
        viewport.originX + 2,
        viewport.originY + 2,
        viewport.cols * viewport.cellSize - 4,
        viewport.rows * viewport.cellSize - 4
      )
      return
    }
    const centre = cellToPoint(mark.cell, viewport)
    const radius = viewport.cellSize * 0.42
    ctx.beginPath()
    ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    for (let spoke = 0; spoke < 8; spoke += 1) {
      const angle = (spoke * Math.PI) / 4
      ctx.moveTo(centre.x + Math.cos(angle) * radius * 0.5, centre.y + Math.sin(angle) * radius * 0.5)
      ctx.lineTo(centre.x + Math.cos(angle) * radius, centre.y + Math.sin(angle) * radius)
    }
    ctx.stroke()
  }

  private pushMark(cell: GridCell, kind: StaticMark['kind']): void {
    this.marks.push({ cell, kind, expiresAtMs: this.elapsedMs + STATIC_MARK_DURATION_MS })
  }

  private burst(cell: GridCell, count: number, colour: string, speedScale: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * Math.PI * 2
      const speed =
        (SPARK_SPEED_MIN + this.random() * (SPARK_SPEED_MAX - SPARK_SPEED_MIN)) * speedScale
      const life = SPARK_LIFE_MIN_MS + this.random() * (SPARK_LIFE_MAX_MS - SPARK_LIFE_MIN_MS)
      this.spawn({
        col: cell.col,
        row: cell.row,
        velocityCol: Math.cos(angle) * speed,
        velocityRow: Math.sin(angle) * speed,
        life,
        colour,
      })
    }
  }

  /** Claim a pool slot. Past capacity the oldest slot is reused, so the array never grows. */
  private spawn(seed: {
    col: number
    row: number
    velocityCol: number
    velocityRow: number
    life: number
    colour: string
  }): void {
    const particle = this.pool[this.cursor]
    this.cursor = (this.cursor + 1) % PARTICLE_CAPACITY
    if (particle === undefined) {
      return
    }
    if (!particle.alive) {
      this.liveCount += 1
    }
    particle.alive = true
    particle.col = seed.col
    particle.row = seed.row
    particle.velocityCol = seed.velocityCol
    particle.velocityRow = seed.velocityRow
    particle.bornAtMs = this.elapsedMs
    particle.expiresAtMs = this.elapsedMs + seed.life
    particle.colour = seed.colour
    particle.size = 1.5 + this.random() * 1.5
  }

  private retireAll(): void {
    for (const particle of this.pool) {
      particle.alive = false
    }
    this.liveCount = 0
    this.cursor = 0
  }
}
