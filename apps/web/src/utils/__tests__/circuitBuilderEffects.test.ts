import { describe, expect, it } from 'vitest'
import {
  CircuitEffects,
  PARTICLE_CAPACITY,
  STATIC_MARK_DURATION_MS,
} from '../circuitBuilderEffects'
import { loadGlow } from '../circuitBuilderRenderer'
import { MIN_VISIBLE_INTENSITY } from '../circuitEngine'
import type { GridPosition } from '../circuitEngine'

const AT: GridPosition = { col: 3, row: 2, rotation: 0 }

/** A fixed pseudo-random source, so a run is reproducible. */
function sequence(): () => number {
  let seed = 1
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
}

function effects(): CircuitEffects {
  return new CircuitEffects(sequence())
}

describe('CircuitEffects particle pool', () => {
  it('spawns particles for a spark burst', () => {
    const subject = effects()
    expect(subject.activeParticleCount).toBe(0)
    expect(subject.active).toBe(false)

    subject.emitSparks(AT, 1)
    expect(subject.activeParticleCount).toBeGreaterThan(0)
    expect(subject.active).toBe(true)
  })

  it('never exceeds the pool capacity, however many bursts arrive', () => {
    const subject = effects()
    for (let index = 0; index < 40; index += 1) {
      subject.emitSparks(AT, 1)
    }
    expect(subject.activeParticleCount).toBeLessThanOrEqual(PARTICLE_CAPACITY)
  })

  it('retires every particle and goes inactive once the bursts have run their course', () => {
    const subject = effects()
    subject.emitSparks(AT, 1)
    for (let step = 0; step < 100; step += 1) {
      subject.update(16)
    }
    expect(subject.activeParticleCount).toBe(0)
    expect(subject.active).toBe(false)
  })

  it('ignores a non-finite or non-positive delta', () => {
    const subject = effects()
    subject.emitSparks(AT, 1)
    const before = subject.activeParticleCount
    subject.update(Number.NaN)
    subject.update(-16)
    subject.update(0)
    expect(subject.activeParticleCount).toBe(before)
  })

  it('clear empties particles and marks', () => {
    const subject = effects()
    subject.emitSparks(AT, 1)
    subject.setReducedMotion(true)
    subject.playFusePop(AT)
    subject.clear()
    expect(subject.activeParticleCount).toBe(0)
    expect(subject.staticMarks).toHaveLength(0)
    expect(subject.active).toBe(false)
  })

  it('fuse pop and celebration are callable in both motion modes without throwing', () => {
    const moving = effects()
    expect(() => {
      moving.playFusePop(AT)
      moving.playCelebration()
    }).not.toThrow()
    expect(moving.activeParticleCount).toBeGreaterThan(0)

    const still = effects()
    still.setReducedMotion(true)
    expect(() => {
      still.playFusePop(AT)
      still.playCelebration()
    }).not.toThrow()
    expect(still.activeParticleCount).toBe(0)
    expect(still.staticMarks).toHaveLength(2)
  })
})

describe('reduced motion substitutes rather than drops', () => {
  it('replaces a spark burst with one static mark', () => {
    const subject = effects()
    subject.setReducedMotion(true)
    subject.emitSparks(AT, 1)
    expect(subject.activeParticleCount).toBe(0)
    expect(subject.staticMarks).toHaveLength(1)
    expect(subject.staticMarks[0]?.cell).toEqual({ col: AT.col, row: AT.row })
    expect(subject.staticMarks[0]?.kind).toBe('spark')
    // The information is still on screen, which is the whole point.
    expect(subject.active).toBe(true)
  })

  it('expires a static mark after its duration of accumulated time', () => {
    const subject = effects()
    subject.setReducedMotion(true)
    subject.emitSparks(AT, 1)

    let elapsed = 0
    while (elapsed < STATIC_MARK_DURATION_MS - 16) {
      subject.update(16)
      elapsed += 16
    }
    expect(subject.staticMarks).toHaveLength(1)

    subject.update(32)
    expect(subject.staticMarks).toHaveLength(0)
    expect(subject.active).toBe(false)
  })

  it('retires live particles when motion is switched off mid-flight', () => {
    const subject = effects()
    subject.emitSparks(AT, 1)
    expect(subject.activeParticleCount).toBeGreaterThan(0)
    subject.setReducedMotion(true)
    expect(subject.activeParticleCount).toBe(0)
  })
})

describe('reduced motion preserves the information, not just the quiet', () => {
  const FAULT: GridPosition = { col: 7, row: 4, rotation: 0 }

  it('keeps the fault position in the spark substitute', () => {
    const subject = effects()
    subject.setReducedMotion(true)
    subject.emitSparks(FAULT, 1)

    expect(subject.activeParticleCount).toBe(0)
    expect(subject.staticMarks).toHaveLength(1)
    const mark = subject.staticMarks[0]
    expect(mark?.kind).toBe('spark')
    // The position is the teaching content: "something went wrong HERE".
    expect(mark?.cell).toEqual({ col: 7, row: 4 })
  })

  it('keeps the fuse position in the fuse substitute', () => {
    const subject = effects()
    subject.setReducedMotion(true)
    subject.playFusePop(FAULT)

    expect(subject.activeParticleCount).toBe(0)
    expect(subject.staticMarks).toHaveLength(1)
    expect(subject.staticMarks[0]?.kind).toBe('fuse')
    expect(subject.staticMarks[0]?.cell).toEqual({ col: 7, row: 4 })
  })

  it('marks a celebration canvas-wide, since a success has no single cell', () => {
    const subject = effects()
    subject.setReducedMotion(true)
    subject.playCelebration()

    expect(subject.activeParticleCount).toBe(0)
    expect(subject.staticMarks).toHaveLength(1)
    expect(subject.staticMarks[0]?.kind).toBe('celebration')
    expect(subject.staticMarks[0]?.cell).toEqual({ col: -1, row: -1 })
  })

  it('expires every substitute mark, so a long session accumulates nothing', () => {
    const subject = effects()
    subject.setReducedMotion(true)
    for (let round = 0; round < 12; round += 1) {
      subject.emitSparks(FAULT, 1)
      subject.playFusePop(FAULT)
      subject.playCelebration()
    }
    expect(subject.staticMarks.length).toBeGreaterThan(0)

    let elapsed = 0
    while (elapsed <= STATIC_MARK_DURATION_MS + 32) {
      subject.update(16)
      elapsed += 16
    }
    expect(subject.staticMarks).toHaveLength(0)
    expect(subject.active).toBe(false)
  })

  it('retires live particles to zero when the preference arrives mid-flight', () => {
    const subject = effects()
    subject.emitSparks(FAULT, 1)
    subject.playCelebration()
    expect(subject.activeParticleCount).toBeGreaterThan(0)

    subject.setReducedMotion(true)
    expect(subject.activeParticleCount).toBe(0)

    // And from then on the same events produce marks instead.
    subject.emitSparks(FAULT, 1)
    expect(subject.activeParticleCount).toBe(0)
    expect(subject.staticMarks).toHaveLength(1)
  })
})

describe('loadGlow', () => {
  it('is monotonic in intensity and stays inside the unit range', () => {
    const samples = [0, MIN_VISIBLE_INTENSITY, 0.5, 1]
    let previous = loadGlow(samples[0] ?? 0)
    for (const intensity of samples.slice(1)) {
      const current = loadGlow(intensity)
      expect(current.coreAlpha).toBeGreaterThan(previous.coreAlpha)
      expect(current.glowAlpha).toBeGreaterThan(previous.glowAlpha)
      expect(current.glowRadiusRatio).toBeGreaterThan(previous.glowRadiusRatio)
      previous = current
    }

    for (const intensity of samples) {
      const glow = loadGlow(intensity)
      for (const value of [glow.coreAlpha, glow.glowAlpha, glow.glowRadiusRatio]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('treats a non-finite or out-of-range intensity as dark', () => {
    expect(loadGlow(Number.NaN)).toEqual(loadGlow(0))
    expect(loadGlow(-5)).toEqual(loadGlow(0))
    expect(loadGlow(50)).toEqual(loadGlow(1))
  })
})
