import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { CircuitEffects } from '@/utils/circuitBuilderEffects'
import type { CircuitEffectsHandle } from '@/utils/circuitBuilderEffects'
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
} from '@/utils/circuitBuilderGeometry'
import type { Viewport } from '@/utils/circuitBuilderGeometry'
import type { GridPosition, GridSize } from '@/utils/circuitEngine'
import { lazyRefValue } from '@/utils/lazyRef'

interface EffectsCanvasProps {
  viewport: Viewport
  gridSize: GridSize
  reducedMotion: boolean
}

/**
 * The particle layer, on its own canvas above the circuit.
 *
 * A second canvas rather than a second draw pass: sparks animate for a few hundred milliseconds
 * while the circuit itself is usually static, and compositing them separately means a burst of
 * particles never forces the grid, the components, and the traces to be redrawn with it.
 *
 * It runs its own animation loop and stops itself the moment nothing is left to draw.
 */
const EffectsCanvas = forwardRef<CircuitEffectsHandle, EffectsCanvasProps>(function EffectsCanvas(
  { viewport, gridSize, reducedMotion },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const effectsRef = useRef<CircuitEffects | null>(null)
  const frameRef = useRef(0)
  const runningRef = useRef(false)
  const lastFrameRef = useRef(0)
  const viewportRef = useRef(viewport)

  viewportRef.current = viewport

  // `useRef(new CircuitEffects())` would allocate the 240-particle pool on every render and throw
  // all but the first away — and this surface re-renders on every pointer MOVE during a drag.
  const effects = useCallback(() => lazyRefValue(effectsRef, () => new CircuitEffects()), [])

  // `pump` is defined as a ref-held closure rather than a callback prop so that the imperative
  // handle below and the effects both reach the same instance without re-creating the loop.
  const pumpRef = useRef<() => void>(() => undefined)

  pumpRef.current = () => {
    if (runningRef.current) {
      return
    }
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (ctx === null) {
      // Fail closed: with no 2D context there is nothing to animate, and nothing is thrown.
      return
    }

    runningRef.current = true
    lastFrameRef.current = 0

    const step = (timestamp: number): void => {
      if (!runningRef.current) {
        return
      }
      const previous = lastFrameRef.current
      lastFrameRef.current = timestamp
      const delta = previous === 0 ? 16 : Math.min(48, timestamp - previous)

      const pool = effects()
      pool.update(delta)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pool.draw(ctx, viewportRef.current)

      if (!pool.active) {
        runningRef.current = false
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        return
      }
      frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
  }

  useImperativeHandle(
    ref,
    (): CircuitEffectsHandle => ({
      emitSparks: (at: GridPosition, intensity: number) => {
        effects().emitSparks(at, intensity)
        pumpRef.current()
      },
      playFusePop: (at: GridPosition) => {
        effects().playFusePop(at)
        pumpRef.current()
      },
      playCelebration: () => {
        effects().playCelebration()
        pumpRef.current()
      },
      setReducedMotion: (enabled: boolean) => {
        effects().setReducedMotion(enabled)
        pumpRef.current()
      },
      clear: () => {
        effects().clear()
      },
    }),
    [effects]
  )

  useEffect(() => {
    effects().setGridSize(gridSize)
  }, [effects, gridSize])

  useEffect(() => {
    effects().setReducedMotion(reducedMotion)
  }, [effects, reducedMotion])

  // Every frame and every particle is released on unmount, so nothing survives the component.
  useEffect(() => {
    return () => {
      runningRef.current = false
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
      // Read inside the cleanup, not when the effect ran: an unmount before anything touched the
      // pool must construct nothing at all. The rule's advice — copy `effectsRef.current` into a
      // variable while the effect runs — would capture `null` on the very first pass and leak the
      // pool of a component that was used after mount, which is the opposite of what it warns
      // about. The late read is deliberate and is exactly the behaviour under test.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      effectsRef.current?.clear()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={CIRCUIT_CANVAS_WIDTH}
      height={CIRCUIT_CANVAS_HEIGHT}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
})

export default EffectsCanvas
