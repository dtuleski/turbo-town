import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  clientToCanvasPoint,
  hitTest,
} from '@/utils/circuitBuilderGeometry'
import type { HitTarget, Point, Viewport } from '@/utils/circuitBuilderGeometry'
import { CONSUMED_KEYS } from '@/utils/circuitBuilderInteraction'
import type { PointerPhase, SelectionState } from '@/utils/circuitBuilderInteraction'
import { drawScene, hasLiveAnimation } from '@/utils/circuitBuilderRenderer'
import type { RenderScene } from '@/utils/circuitBuilderRenderer'
import type { CircuitBuilderState } from '@/utils/circuitBuilderState'
import type { CircuitResult } from '@/utils/circuitEngine'

interface GridCanvasProps {
  state: CircuitBuilderState
  /** `null` when the engine returned an error. The grid then draws de-energized. */
  result: CircuitResult | null
  viewport: Viewport
  selection: SelectionState
  reducedMotion: boolean
  label: string
  /**
   * Optional handle on the grid canvas itself, for a host that needs to measure it — a touch drop
   * from the tray has to know where the grid is. Supplying one is cheaper and far less fragile
   * than finding the element by DOM order.
   */
  canvasRef?: RefObject<HTMLCanvasElement>
  onPointerEvent: (phase: PointerPhase, point: Point, hit: HitTarget) => void
  onKeyEvent: (key: string, shift: boolean) => void
  children?: ReactNode
}

/** Advertised to assistive technology, and the same vocabulary `resolveKeyIntent` implements.
 * `Tab` is deliberately absent from both, so focus always escapes the canvas. */
const ARIA_KEY_SHORTCUTS =
  'ArrowUp ArrowDown ArrowLeft ArrowRight Enter Shift+Enter C Shift+C Delete Escape'

/**
 * The circuit canvas: one fixed logical surface that CSS scales responsively.
 *
 * It converts raw browser input into a logical point and a hit target and reports both. It resolves
 * no intent and holds no selection, which is what keeps rendering and interaction separable.
 *
 * The animation loop is dirty-flag driven. A dirty flag rather than true dirty rectangles because
 * an energized trace's glow bleeds well past any rectangle you could compute from the geometry, so
 * a rectangular invalidation region would be wrong in exactly the cases that matter.
 */
export default function GridCanvas({
  state,
  result,
  viewport,
  selection,
  reducedMotion,
  label,
  canvasRef: forwardedCanvasRef,
  onPointerEvent,
  onKeyEvent,
  children,
}: GridCanvasProps) {
  const ownCanvasRef = useRef<HTMLCanvasElement>(null)
  // One ref either way, so nothing has to be kept in sync: the host's ref, when it supplies one,
  // IS the canvas ref this component uses.
  const canvasRef = forwardedCanvasRef ?? ownCanvasRef
  const sceneRef = useRef<RenderScene | null>(null)
  const dirtyRef = useRef(true)
  const frameRef = useRef(0)
  const runningRef = useRef(false)
  const startedAtRef = useRef(0)
  const pumpRef = useRef<() => void>(() => undefined)

  sceneRef.current = {
    state,
    result,
    viewport,
    selection,
    timeMs: 0,
    reducedMotion,
  }

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
      // Fail closed: no context means no drawing, quietly, with nothing thrown and no loop left
      // spinning.
      return
    }
    if (startedAtRef.current === 0) {
      startedAtRef.current = Date.now()
    }

    runningRef.current = true
    const step = (): void => {
      if (!runningRef.current) {
        return
      }
      const scene = sceneRef.current
      if (scene === null) {
        runningRef.current = false
        return
      }
      const live = hasLiveAnimation(scene)
      if (!dirtyRef.current && !live) {
        runningRef.current = false
        return
      }
      dirtyRef.current = false
      drawScene(ctx, { ...scene, timeMs: Date.now() - startedAtRef.current })
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }

  // Any change to what is on screen marks the canvas dirty and restarts the loop, which draws
  // once and then stops itself unless something is animating.
  useEffect(() => {
    dirtyRef.current = true
    pumpRef.current()
  }, [state, result, viewport, selection, reducedMotion])

  useEffect(() => {
    return () => {
      runningRef.current = false
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
    }
  }, [])

  function toLogicalPoint(client: Point): Point | null {
    const canvas = canvasRef.current
    if (canvas === null) {
      return null
    }
    const rect = canvas.getBoundingClientRect()
    return clientToCanvasPoint(client, rect, {
      width: CIRCUIT_CANVAS_WIDTH,
      height: CIRCUIT_CANVAS_HEIGHT,
    })
  }

  function report(phase: PointerPhase, client: Point): void {
    const point = toLogicalPoint(client)
    if (point === null) {
      return
    }
    onPointerEvent(phase, point, hitTest(point, state.layout, viewport))
  }

  function handleMouse(phase: PointerPhase) {
    return (event: React.MouseEvent<HTMLCanvasElement>): void => {
      report(phase, { x: event.clientX, y: event.clientY })
    }
  }

  function handleTouch(phase: PointerPhase) {
    return (event: React.TouchEvent<HTMLCanvasElement>): void => {
      const touch = event.touches[0] ?? event.changedTouches[0]
      if (touch === undefined) {
        onPointerEvent(phase, { x: -1, y: -1 }, { kind: 'outside' })
        return
      }
      report(phase, { x: touch.clientX, y: touch.clientY })
    }
  }

  function handleDrop(event: React.DragEvent<HTMLCanvasElement>): void {
    event.preventDefault()
    report('up', { x: event.clientX, y: event.clientY })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>): void {
    if (CONSUMED_KEYS.has(event.key)) {
      event.preventDefault()
    }
    onKeyEvent(event.key, event.shiftKey)
  }

  return (
    <div className="relative w-full max-w-[min(94vw,960px)]">
      <canvas
        ref={canvasRef}
        width={CIRCUIT_CANVAS_WIDTH}
        height={CIRCUIT_CANVAS_HEIGHT}
        tabIndex={0}
        role="application"
        aria-label={label}
        aria-keyshortcuts={ARIA_KEY_SHORTCUTS}
        // A real outline ring rather than a border tint: a 1px colour change on an already-dark
        // border is not a visible focus indicator, and CB-6.1 asks for focus to always be visible.
        className="aspect-[3/2] w-full touch-none rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        onMouseDown={handleMouse('down')}
        onMouseMove={handleMouse('move')}
        onMouseUp={handleMouse('up')}
        onMouseLeave={handleMouse('cancel')}
        onTouchStart={handleTouch('down')}
        onTouchMove={handleTouch('move')}
        onTouchEnd={handleTouch('up')}
        onTouchCancel={handleTouch('cancel')}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
      />
      {children}
    </div>
  )
}
