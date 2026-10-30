import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameAudio } from '@/hooks/useGameAudio'
import { usePresentationPreferences } from '@/hooks/usePresentationPreferences'
import type { CircuitEffectsHandle } from '@/utils/circuitBuilderEffects'
import {
  CIRCUIT_CANVAS_HEIGHT,
  CIRCUIT_CANVAS_WIDTH,
  clientToCanvasPoint,
  computeViewport,
  hitTest,
} from '@/utils/circuitBuilderGeometry'
import type { HitTarget, Point } from '@/utils/circuitBuilderGeometry'
import {
  beginTrayDrag,
  createInitialSelection,
  intentToAction,
  isActivatingPhase,
  resolveKeyIntent,
  resolvePointerIntent,
  resolveTrayIntent,
} from '@/utils/circuitBuilderInteraction'
import type { IntentResult, PointerPhase, SelectionState } from '@/utils/circuitBuilderInteraction'
import {
  circuitReducer,
  createInitialState,
  selectFaultEffectKey,
  selectSubmissionPayload,
  selectTrayItems,
} from '@/utils/circuitBuilderState'
import type { CircuitSubmissionDraft } from '@/utils/circuitBuilderState'
import {
  MAX_LIGHT_LEVEL,
  MAX_SOURCE_VOLTAGE,
  MIN_LIGHT_LEVEL,
  MIN_SOURCE_VOLTAGE,
  SOURCE_VOLTAGE_STEP,
  evaluateMemoized,
  getLevel,
  isEvaluationError,
} from '@/utils/circuitEngine'
import type { CircuitResult, ElementKind, FaultCode, LevelDefinition } from '@/utils/circuitEngine'
import { computeFaultOverlay } from '@/utils/circuitFaultOverlay'
import { sliderValueText } from '@/utils/circuitSliderLabel'
import { deriveRoverView } from '@/utils/marsRover'
import CircuitReadout from './CircuitReadout'
import ComponentTray from './ComponentTray'
import EffectsCanvas from './EffectsCanvas'
import FaultTooltipOverlay from './FaultTooltipOverlay'
import GridCanvas from './GridCanvas'
import RoverPanel from './RoverPanel'

/**
 * What a host learns each time the circuit changes: the draft, the engine result and the fuse.
 * Fired on circuit change only, never on the one-second clock tick.
 */
export interface CircuitFrame {
  draft: CircuitSubmissionDraft
  result: CircuitResult | null
  fuseBlown: boolean
}

interface CircuitBuilderSurfaceProps {
  /** Defaults to the sandbox, the only level that offers all eight component kinds. */
  level?: LevelDefinition
  reducedMotion?: boolean
  /** Called with the payload the backend will later receive, minus the session id. Nothing in
   * this unit sends it. */
  onSubmissionReady?: (draft: CircuitSubmissionDraft) => void
  /** Called whenever the circuit, its result or the fuse changes. */
  onFrame?: (frame: CircuitFrame) => void
  /** Turning this true plays the celebration once per false-to-true edge. */
  celebrate?: boolean
  /** Both default to true. */
  showRover?: boolean
  showReadout?: boolean
  className?: string
}

/** The body's props: the level is already resolved, so nothing downstream can be levelless. */
interface CircuitSurfaceBodyProps {
  level: LevelDefinition
  /** Omitted means "follow the operating system". An explicit value wins over the media query. */
  reducedMotion?: boolean
  onSubmissionReady?: (draft: CircuitSubmissionDraft) => void
  onFrame?: (frame: CircuitFrame) => void
  celebrate?: boolean
  showRover: boolean
  showReadout: boolean
  className?: string
}

/** Faults that blow the fuse, and therefore the ones worth a spark. */
const BLOCKING_FAULTS = new Set(['SHORT_CIRCUIT', 'SINGULAR_SYSTEM'])

/**
 * The circuit building surface.
 *
 * Owns the reducer, the single selection object, and the evaluation. The circuit is evaluated on
 * state change and never per animation frame: the engine costs single-digit milliseconds at its
 * element ceiling, which does not fit a frame, so the memo in `circuitEngine` is what makes a
 * repeat render free and the animation loop reads the last result from props.
 *
 * Deliberately self-contained: no session, no backend call, no level content, no success
 * evaluation. Those belong to later units. Audio and the presentation preferences are wired in
 * through their hooks, both of which fail silently when the browser cannot oblige.
 *
 * Takes an already-resolved `level`: `useReducer` cannot be called conditionally, so resolution
 * happens in the exported guard below, before any hook runs. `LevelDefinition` is the engine's own
 * type, so the level data has exactly one source and this file holds no copy of it.
 */
function CircuitSurfaceBody({
  level,
  reducedMotion,
  onSubmissionReady,
  onFrame,
  celebrate,
  showRover,
  showReadout,
  className,
}: CircuitSurfaceBodyProps) {
  const { t } = useTranslation()

  const [state, dispatch] = useReducer(circuitReducer, level, createInitialState)
  const [selection, setSelection] = useState<SelectionState>(createInitialSelection)
  /** A CSS overlay, not the Fullscreen API: `requestFullscreen` can reject, is unavailable for
   * non-video elements on iOS Safari, and would need its own gesture. */
  const [fullScreen, setFullScreen] = useState(false)

  const preferences = usePresentationPreferences()
  const { unlock: unlockAudio, play: playAudio } = useGameAudio({
    // Safe as an inline arrow: the hook holds this in a ref, so it never re-creates the service.
    isSoundEnabled: () => preferences.soundEnabled,
  })

  // An explicitly supplied prop keeps precedence over the operating system, so a caller that
  // wants a fixed motion mode still gets one. Reduced motion changes this one flag and nothing
  // else: the renderer and the effects layer already branch on it.
  const effectiveReducedMotion = reducedMotion ?? preferences.reducedMotion

  const selectionRef = useRef(selection)
  const effectsRef = useRef<CircuitEffectsHandle>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const gridCanvasRef = useRef<HTMLCanvasElement>(null)
  const startedAtRef = useRef(Date.now())

  selectionRef.current = selection

  const viewport = useMemo(
    () =>
      computeViewport(
        { width: CIRCUIT_CANVAS_WIDTH, height: CIRCUIT_CANVAS_HEIGHT },
        state.layout.gridSize
      ),
    [state.layout.gridSize]
  )

  // Derived during render, through the memo. A repeat render costs one canonical-string build and
  // one map lookup.
  const outcome = evaluateMemoized(state.layout, state.switches, state.environment)
  const result: CircuitResult | null = isEvaluationError(outcome) ? null : outcome
  const evaluationFailed = result === null

  // The engine's own error detail never reaches the player: a generic line, no code, no issue
  // list, no stack (SECURITY-09). No success and no celebration either — fail closed.
  const faultCodes: readonly FaultCode[] = result === null ? [] : result.faults.map((fault) => fault.code)
  const faultCodesRef = useRef(faultCodes)
  faultCodesRef.current = faultCodes

  // One fault EVENT, identified by the reducer's epoch plus every fault's code and position.
  //
  // Why this cannot loop: dispatching `faultsEvaluated` changes `fuseBlown` but changes neither
  // `faultEpoch` nor the engine's reported faults, so the key is already stable on the render that
  // follows the dispatch and the effect cannot re-trigger itself. A `resetFuse` bumps the epoch
  // exactly once, so one reset costs exactly one extra render — and that extra run is the whole
  // point: a short still wired after a reset must blow the fuse again (CB-3.8).
  const faultEffectKey = selectFaultEffectKey(state.faultEpoch, result?.faults ?? [])

  useEffect(() => {
    // Safe against a render loop: the reducer returns the identical state reference when the
    // reported faults change nothing.
    dispatch({ type: 'faultsEvaluated', codes: faultCodesRef.current })
  }, [faultEffectKey])

  useEffect(() => {
    if (result === null) {
      return
    }
    const blocking = result.faults.find((fault) => BLOCKING_FAULTS.has(fault.code))
    if (blocking?.atPosition === undefined) {
      return
    }
    effectsRef.current?.emitSparks(blocking.atPosition, 1)
    effectsRef.current?.playFusePop(blocking.atPosition)
    // Silent before the first gesture, while muted, and when audio is unsupported — `play` never
    // throws in any of those states, so it needs no guard here.
    playAudio('fusePop')
    // Keyed on the fault event, so one short sparks once rather than once per render — but a short
    // that recurs after a fuse reset, or moves to another cell, sparks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faultEffectKey])

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({
        type: 'tick',
        elapsedSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
      })
    }, 1000)
    const effects = effectsRef.current
    return () => {
      clearInterval(interval)
      effects?.clear()
    }
  }, [])

  const stateRef = useRef(state)
  stateRef.current = state

  // Keyed on the circuit itself, not on the whole state, so the one-second clock does not
  // re-notify a caller every tick.
  useEffect(() => {
    onSubmissionReady?.(selectSubmissionPayload(stateRef.current))
  }, [state.layout, state.switches, state.environment, onSubmissionReady])

  // The host's callback goes through a ref, so a new function identity each render never re-fires
  // the frame. Keyed on the circuit, its result and the fuse: not on the clock tick.
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  useEffect(() => {
    onFrameRef.current?.({
      draft: selectSubmissionPayload(stateRef.current),
      result,
      fuseBlown: state.fuseBlown,
    })
  }, [state.layout, state.switches, state.environment, result, state.fuseBlown])

  // One celebration per false-to-true edge of the prop.
  const celebratedRef = useRef(false)
  useEffect(() => {
    if (celebrate !== true) {
      celebratedRef.current = false
      return
    }
    if (celebratedRef.current) {
      return
    }
    celebratedRef.current = true
    effectsRef.current?.playCelebration()
    playAudio('celebration')
  }, [celebrate, playAudio])

  const apply = useCallback((resolved: IntentResult, previous: SelectionState) => {
    if (resolved.selection !== previous) {
      setSelection(resolved.selection)
      selectionRef.current = resolved.selection
    }
    if (resolved.intent === null) {
      return
    }
    // `previous` on purpose: `completeConnection` reads the pending terminal the resolver has
    // already cleared.
    const action = intentToAction(resolved.intent, previous, stateRef.current)
    if (action !== null) {
      dispatch(action)
    }
  }, [])

  // Only an ACTIVATING phase unlocks audio. A browser lets an audio context start inside a user
  // gesture and nowhere else, and `unlock()` is one-shot by lifecycle state — so spending it on a
  // `move`, which fires on a plain hover with no activation behind it, is the one call that cannot
  // be retried: a browser that rejects `resume()` outside a gesture would latch the terminal
  // `unsupported` state and kill audio for the whole session, and creating the context there is
  // exactly what produces Chrome's autoplay warning CB-6.5 requires to be absent. The rule itself
  // is `isActivatingPhase` in the interaction module, where a test can reach it — this component
  // cannot be rendered in a test. `handleKeyEvent` and `handleArm` are activating by nature.
  const handlePointerEvent = useCallback(
    (phase: PointerPhase, point: Point, hit: HitTarget) => {
      if (isActivatingPhase(phase)) {
        unlockAudio()
      }
      const previous = selectionRef.current
      apply(resolvePointerIntent(phase, point, hit, previous), previous)
    },
    [apply, unlockAudio]
  )

  const handleKeyEvent = useCallback(
    (key: string, shift: boolean) => {
      unlockAudio()
      const previous = selectionRef.current
      apply(resolveKeyIntent(key, shift, previous, stateRef.current), previous)
    },
    [apply, unlockAudio]
  )

  const handleArm = useCallback(
    (kind: ElementKind) => {
      unlockAudio()
      const previous = selectionRef.current
      const next = resolveTrayIntent(kind, previous).selection
      setSelection(next)
      selectionRef.current = next
    },
    [unlockAudio]
  )

  const handleDragStart = useCallback((kind: ElementKind) => {
    const next = beginTrayDrag(kind, selectionRef.current)
    setSelection(next)
    selectionRef.current = next
  }, [])

  const handleDragEnd = useCallback(() => {
    const previous = selectionRef.current
    if (previous.drag === null) {
      return
    }
    const next: SelectionState = { ...previous, drag: null }
    setSelection(next)
    selectionRef.current = next
  }, [])

  /** Touch release over the tray: place only if the finger actually ended on the canvas. */
  const handleTouchDrop = useCallback(
    (kind: ElementKind, client: Point) => {
      // The grid canvas by reference, not by DOM order: a `querySelector('canvas')` silently
      // retargets to the effects overlay the moment the two ever swap places, and the full-screen
      // `flex-col-reverse` restructuring moves that markup around.
      const grid = gridCanvasRef.current
      if (grid === null) {
        handleDragEnd()
        return
      }
      const rect = grid.getBoundingClientRect()
      const inside =
        client.x >= rect.left &&
        client.x <= rect.right &&
        client.y >= rect.top &&
        client.y <= rect.bottom
      if (!inside) {
        handleDragEnd()
        return
      }
      const point = clientToCanvasPoint(client, rect, {
        width: CIRCUIT_CANVAS_WIDTH,
        height: CIRCUIT_CANVAS_HEIGHT,
      })
      const previous = beginTrayDrag(kind, selectionRef.current)
      apply(
        resolvePointerIntent('up', point, hitTest(point, stateRef.current.layout, viewport), previous),
        previous
      )
    },
    [apply, handleDragEnd, viewport]
  )

  const trayItems = selectTrayItems(state)
  const rejectionCode = state.lastRejection?.code ?? null
  const energized = result !== null && !state.fuseBlown && result.elements.some((item) => item.energized)
  /** The first active fault gets the educational line. One at a time, so the status row stays one
   * readable sentence rather than a wall of advice. */
  const faultHelpCode = faultCodes[0] ?? null

  const faultOverlay = useMemo(
    () => computeFaultOverlay(result?.faults ?? [], viewport),
    [result, viewport]
  )
  const roverView = useMemo(
    () => deriveRoverView(level, result, state.fuseBlown),
    [level, result, state.fuseBlown]
  )
  const handleResetFuse = useCallback(() => {
    dispatch({ type: 'resetFuse' })
  }, [])

  return (
    <div
      className={[
        fullScreen
          ? // `h-dvh`, not `h-screen`: mobile browser chrome makes `100vh` overflow. `flex-col-reverse`
            // puts the tray visually at the bottom, within thumb reach and not over the grid, while
            // the DOM order stays tray-first so the tab order still reads tray then canvas.
            'fixed inset-0 z-40 flex h-dvh w-screen flex-col-reverse overflow-hidden bg-slate-950'
          : 'flex w-full flex-col items-center gap-4 bg-slate-950 p-3 lg:flex-row lg:items-start lg:justify-center',
        className ?? '',
      ].join(' ')}
    >
      <ComponentTray
        items={trayItems}
        armedKind={selection.armedKind}
        onArm={handleArm}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTouchDrop={handleTouchDrop}
        className={fullScreen ? 'shrink-0' : undefined}
      />

      <div
        ref={canvasHostRef}
        className={[
          'flex w-full flex-col items-center gap-2',
          fullScreen ? 'min-h-0 flex-1' : '',
        ]
          .join(' ')
          .trimEnd()}
      >
        <GridCanvas
          state={state}
          result={result}
          viewport={viewport}
          selection={selection}
          reducedMotion={effectiveReducedMotion}
          label={t('circuitBuilder.canvasLabel')}
          canvasRef={gridCanvasRef}
          onPointerEvent={handlePointerEvent}
          onKeyEvent={handleKeyEvent}
        >
          <EffectsCanvas
            ref={effectsRef}
            viewport={viewport}
            gridSize={state.layout.gridSize}
            reducedMotion={effectiveReducedMotion}
          />
          <FaultTooltipOverlay
            overlay={faultOverlay}
            fuseBlown={state.fuseBlown}
            faultKey={faultEffectKey}
            reducedMotion={effectiveReducedMotion}
            onResetFuse={handleResetFuse}
          />
        </GridCanvas>

        <p className="max-w-[min(94vw,960px)] text-center text-[11px] text-slate-400">
          {t('circuitBuilder.canvasHint')}
        </p>

        {/* `lg:hidden`, so desktop keeps rendering inside AppLayout's shell with no extra control. */}
        <div className="lg:hidden">
          <button
            type="button"
            aria-pressed={fullScreen}
            onClick={() => {
              setFullScreen((current) => !current)
            }}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500/60"
          >
            {t(
              fullScreen
                ? 'circuitBuilder.layout.exitFullScreen'
                : 'circuitBuilder.layout.enterFullScreen'
            )}
          </button>
        </div>

        <div
          aria-live="polite"
          className="flex min-h-6 flex-wrap items-center justify-center gap-3 text-xs"
        >
          <span className={energized ? 'text-cyan-300' : 'text-slate-400'}>
            {t(energized ? 'circuitBuilder.status.energized' : 'circuitBuilder.status.deEnergized')}
          </span>
          {evaluationFailed && (
            <span className="text-amber-300">{t('circuitBuilder.error.evaluationUnavailable')}</span>
          )}
          {rejectionCode !== null && (
            <span className="text-amber-300">{t(`circuitBuilder.rejection.${rejectionCode}`)}</span>
          )}
          {faultHelpCode !== null && (
            // The sighted player reads the same copy on the tooltip card; this span keeps the live
            // region as the one announcement for assistive technology.
            <span className="sr-only">{t(`circuitBuilder.faultHelp.${faultHelpCode}`)}</span>
          )}
          {state.fuseBlown && (
            <>
              <span className="text-rose-300">{t('circuitBuilder.status.fuseBlown')}</span>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'resetFuse' })
                }}
                className="min-h-[44px] rounded-lg border border-rose-400/60 px-3 py-2 text-rose-200 hover:bg-rose-500/10"
              >
                {t('circuitBuilder.status.resetFuse')}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={[
          'flex w-full flex-col gap-3 lg:w-48',
          fullScreen ? 'shrink-0 px-3' : '',
        ]
          .join(' ')
          .trimEnd()}
      >
        <button
          type="button"
          aria-pressed={preferences.soundEnabled}
          onClick={() => {
            preferences.setSoundEnabled(!preferences.soundEnabled)
          }}
          className="min-h-[44px] rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500/60"
        >
          {t(
            preferences.soundEnabled ? 'circuitBuilder.audio.soundOn' : 'circuitBuilder.audio.soundOff'
          )}
        </button>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span>
            {sliderLabel(t('circuitBuilder.status.voltage'), sliderValueText(level.numericDisclosure, 'voltage', state.environment.sourceVoltage))}
          </span>
          <input
            type="range"
            min={MIN_SOURCE_VOLTAGE}
            max={MAX_SOURCE_VOLTAGE}
            step={SOURCE_VOLTAGE_STEP}
            value={state.environment.sourceVoltage}
            onChange={(event) => {
              dispatch({ type: 'setVoltage', volts: Number(event.target.value) })
            }}
            className="h-6 accent-cyan-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span>
            {sliderLabel(t('circuitBuilder.status.lightLevel'), sliderValueText(level.numericDisclosure, 'light', state.environment.lightLevel))}
          </span>
          <input
            type="range"
            min={MIN_LIGHT_LEVEL}
            max={MAX_LIGHT_LEVEL}
            step={0.05}
            value={state.environment.lightLevel}
            onChange={(event) => {
              dispatch({ type: 'setLightLevel', level: Number(event.target.value) })
            }}
            className="h-6 accent-cyan-400"
          />
        </label>
        {showRover && <RoverPanel view={roverView} reducedMotion={effectiveReducedMotion} />}
        {showReadout && (
          <CircuitReadout
            result={result}
            layout={state.layout}
            tier={level.numericDisclosure}
            fuseBlown={state.fuseBlown}
          />
        )}
      </div>
    </div>
  )
}

/**
 * The circuit building surface.
 *
 * A guard around `CircuitSurfaceBody`, and nothing else. It exists because `useReducer` needs the
 * level on its very first call and hooks cannot be called conditionally, so the level has to be
 * resolved before the body mounts.
 *
 * When no level is supplied and the engine registry cannot produce the sandbox either, this fails
 * closed with one localized line: no engine detail, no error code, no issue list, no stack reaches
 * the player (SECURITY-09). There is deliberately no hard-coded fallback definition here — level
 * data has exactly one source, the engine.
 */
function sliderLabel(name: string, valueText: string | null): string {
  return valueText === null ? name : `: ${valueText}`
}

export default function CircuitBuilderSurface({
  level,
  reducedMotion,
  onSubmissionReady,
  onFrame,
  celebrate,
  showRover = true,
  showReadout = true,
  className,
}: CircuitBuilderSurfaceProps) {
  const { t } = useTranslation()
  const resolved = level ?? getLevel('sandbox')

  if (resolved === undefined) {
    return <p className="p-4 text-center text-sm text-amber-300">{t('circuitBuilder.error.levelUnavailable')}</p>
  }

  return (
    <CircuitSurfaceBody
      level={resolved}
      reducedMotion={reducedMotion}
      onSubmissionReady={onSubmissionReady}
      onFrame={onFrame}
      celebrate={celebrate}
      showRover={showRover}
      showReadout={showReadout}
      className={className}
    />
  )
}
