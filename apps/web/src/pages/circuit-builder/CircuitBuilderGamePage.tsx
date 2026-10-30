import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { ROUTES } from '@/config/constants'
import { useGuidedSession } from '@/hooks/useGuidedSession'
import { routeForStartOutcome } from '@/services/circuitGameSession'
import type { LevelDefinition } from '@/utils/circuitEngine'
import { levelCopyKey, nextGuidedLevel, parseGameSearch } from '@/utils/circuitLevels'
import CircuitBuilderSurface from './CircuitBuilderSurface'

const BUTTON =
  'min-h-[44px] rounded-lg border px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300'

/**
 * Route entry: resolves `?difficulty=&level=` and hands a valid level to the game. Anything else
 * goes back to the setup page, so no URL is a dead screen. The game is keyed by level, so moving to
 * the next level builds a fresh session.
 */
export default function CircuitBuilderGamePage() {
  const { search } = useLocation()
  const parsed = useMemo(() => parseGameSearch(search), [search])
  if (parsed === null) {
    return <Navigate to={ROUTES.CIRCUIT_BUILDER_SETUP} replace />
  }
  return <GuidedGame key={parsed.level.id} level={parsed.level} />
}

function GuidedGame({ level }: { level: LevelDefinition }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, state } = useGuidedSession(level)
  const [hintOpen, setHintOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(true)

  // A start that did not produce a game always lands somewhere useful.
  useEffect(() => {
    if (state.phase !== 'startFailed' || state.startOutcome === null) {
      return
    }
    const route = routeForStartOutcome(state.startOutcome)
    if (route !== null) {
      navigate(route.path, { state: route.state, replace: true })
    }
  }, [state.phase, state.startOutcome, navigate])

  const next = nextGuidedLevel(level.id)
  const goNext = (): void => {
    if (next !== null) {
      navigate(
        `${ROUTES.CIRCUIT_BUILDER_GAME}?difficulty=${String(next.difficulty)}&level=${encodeURIComponent(next.id)}`
      )
    }
  }
  const goSetup = (): void => {
    navigate(ROUTES.CIRCUIT_BUILDER_SETUP)
  }

  if (state.phase === 'idle' || state.phase === 'starting' || state.phase === 'startFailed') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <p role="status" className="text-slate-200">
          {t('circuitBuilder.game.loading')}
        </p>
      </div>
    )
  }

  const solved = state.phase === 'submitting' || state.phase === 'submitted' || state.phase === 'submitFailed'
  const result = state.result
  // Only what the server returned. The modal's difficulty cell takes text; the numbers are untouched.
  const breakdown =
    result?.scoreBreakdown == null
      ? null
      : { ...result.scoreBreakdown, difficulty: String(result.scoreBreakdown.difficulty) }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4">
      <header className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-black text-white">{t(levelCopyKey(level.id, 'title'))}</h1>
          <button
            type="button"
            onClick={goSetup}
            className={`${BUTTON} border-slate-500 text-slate-200 hover:border-cyan-500/60`}
          >
            {t('circuitBuilder.game.quit')}
          </button>
        </div>
        <p className="text-sm text-slate-200">
          <span className="font-semibold text-cyan-200">{t('circuitBuilder.game.goal')}: </span>
          {t(levelCopyKey(level.id, 'goal'))}
        </p>
        <div>
          <button
            type="button"
            aria-expanded={hintOpen}
            onClick={() => {
              setHintOpen((open) => !open)
            }}
            className={`${BUTTON} border-slate-600 text-slate-200 hover:border-cyan-500/60`}
          >
            {t(hintOpen ? 'circuitBuilder.game.hideHint' : 'circuitBuilder.game.showHint')}
          </button>
          {hintOpen && <p className="mt-2 text-sm text-slate-300">{t(levelCopyKey(level.id, 'hint'))}</p>}
        </div>
      </header>

      {state.phase === 'submitting' && (
        <p role="status" className="mb-3 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {t('circuitBuilder.game.submitting')}
        </p>
      )}
      {state.phase === 'submitFailed' && (
        <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-100">
          <span>{t('circuitBuilder.game.submitFailed')}</span>
          <button
            type="button"
            onClick={session.retry}
            className={`${BUTTON} border-amber-300 text-amber-100 hover:bg-amber-500/10`}
          >
            {t('circuitBuilder.game.retry')}
          </button>
        </div>
      )}
      {state.phase === 'playing' && state.failure === 'rejected' && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-100">
          {t('circuitBuilder.game.rejected')}
        </p>
      )}

      <CircuitBuilderSurface level={level} onFrame={session.observe} celebrate={solved} />

      {state.phase === 'submitted' && (
        <section className="mt-4 rounded-2xl border border-cyan-500/40 bg-slate-900 p-4 text-slate-100">
          <h2 className="text-lg font-bold text-cyan-200">{t('circuitBuilder.game.solvedTitle')}</h2>
          <h3 className="mt-2 text-sm font-semibold">{t('circuitBuilder.game.learnTitle')}</h3>
          <p className="text-sm text-slate-200">{t(levelCopyKey(level.id, 'learn'))}</p>
          <p className="mt-2 text-xs text-slate-400">{t('circuitBuilder.result.serverScoreNote')}</p>
          {result?.leaderboardRank != null && (
            <p className="text-sm">
              {t('circuitBuilder.result.rankLabel')}: #{result.leaderboardRank}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {next !== null && (
              <button
                type="button"
                onClick={goNext}
                className={`${BUTTON} border-cyan-400 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30`}
              >
                {t('circuitBuilder.game.nextLevel')}
              </button>
            )}
            <button
              type="button"
              onClick={goSetup}
              className={`${BUTTON} border-slate-500 text-slate-200 hover:border-cyan-500/60`}
            >
              {t('circuitBuilder.game.backToSetup')}
            </button>
          </div>
        </section>
      )}

      <ScoreBreakdownModal
        isOpen={state.phase === 'submitted' && modalOpen}
        onClose={() => {
          setModalOpen(false)
        }}
        scoreBreakdown={breakdown}
        leaderboardRank={result?.leaderboardRank ?? null}
        onPlayAgain={goSetup}
        gameType="CIRCUIT_BUILDER"
      />
    </div>
  )
}
