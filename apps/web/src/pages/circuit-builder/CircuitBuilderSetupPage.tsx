import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { canStartGame } from '@/api/game'
import { ROUTES } from '@/config/constants'
import {
  GUIDED_DIFFICULTIES,
  difficultyCopyKey,
  guidedLevelsForDifficulty,
  levelCopyKey,
} from '@/utils/circuitLevels'
import type { GuidedDifficulty } from '@/utils/circuitLevels'

const FOCUS_RING =
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-400'

/** The state router puts here when a start fails; read defensively, it is user-reachable data. */
function startFailedFrom(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { startFailed?: unknown }).startFailed === true
}

export default function CircuitBuilderSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const [difficulty, setDifficulty] = useState<GuidedDifficulty>(1)
  const levels = useMemo(() => guidedLevelsForDifficulty(difficulty), [difficulty])
  const [chosenLevelId, setChosenLevelId] = useState<string | null>(null)
  const selectedLevel = levels.find((level) => level.id === chosenLevelId) ?? levels[0] ?? null

  // Advisory gate, like Mini Golf: the server stays authoritative, so an error here is ignored.
  useEffect(() => {
    let active = true
    const checkAccess = async (): Promise<void> => {
      try {
        const result = await canStartGame()
        const tier = result?.rateLimit?.tier
        if (active && (!tier || tier === 'FREE')) {
          navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true }, replace: true })
        }
      } catch {
        // Let the server's startGame decide.
      }
    }
    void checkAccess()
    return () => {
      active = false
    }
  }, [navigate])

  const handleStart = (): void => {
    if (selectedLevel === null) {
      return
    }
    navigate(
      `${ROUTES.CIRCUIT_BUILDER_GAME}?difficulty=${String(difficulty)}&level=${encodeURIComponent(selectedLevel.id)}`
    )
  }

  const steps = ['step1', 'step2', 'step3', 'step4'] as const

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-black text-white md:text-5xl">{t('circuitBuilder.setup.title')}</h1>
          <p className="text-xl font-bold text-cyan-200">{t('circuitBuilder.setup.subtitle')}</p>
          <p className="mx-auto mt-2 max-w-lg text-base text-slate-300">
            {t('circuitBuilder.setup.description')}
          </p>
        </header>

        {startFailedFrom(location.state) && (
          <p role="alert" className="mb-6 rounded-xl border border-amber-400/60 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
            {t('circuitBuilder.setup.startFailed')}
          </p>
        )}

        <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-slate-800/50 p-6">
          <h2 className="mb-4 text-center text-xl font-bold text-white">{t('circuitBuilder.setup.howToPlay')}</h2>
          <ol className="grid grid-cols-1 gap-4 text-center text-sm text-slate-200 md:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step} className="p-2">
                <span aria-hidden="true" className="mb-1 block text-2xl font-black text-cyan-300">
                  {index + 1}
                </span>
                {t(`circuitBuilder.setup.${step}`)}
              </li>
            ))}
          </ol>
        </section>

        <fieldset className="mb-8 rounded-3xl border border-cyan-500/20 bg-slate-800/50 p-6">
          <legend className="px-2 text-xl font-bold text-white">{t('circuitBuilder.setup.chooseDifficulty')}</legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {GUIDED_DIFFICULTIES.map((value) => {
              const selected = value === difficulty
              return (
                <label key={value} className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name="circuit-difficulty"
                    value={value}
                    checked={selected}
                    onChange={() => {
                      setDifficulty(value)
                      setChosenLevelId(null)
                    }}
                    className="peer sr-only"
                  />
                  <div
                    className={[
                      'min-h-[44px] rounded-2xl border-2 p-4',
                      selected
                        ? 'border-cyan-400 bg-cyan-500/15'
                        : 'border-slate-600/50 bg-slate-700/20 hover:border-cyan-400/50',
                      FOCUS_RING,
                    ].join(' ')}
                  >
                    <h3 className="text-lg font-bold text-white">
                      <span aria-hidden="true">{selected ? '◉ ' : '○ '}</span>
                      {t(difficultyCopyKey(value, 'name'))}
                    </h3>
                    <p className="mt-1 text-sm text-slate-200">{t(difficultyCopyKey(value, 'summary'))}</p>
                    <p className="mt-1 text-xs text-cyan-200">{t(difficultyCopyKey(value, 'disclosure'))}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t(difficultyCopyKey(value, 'levels'), { count: guidedLevelsForDifficulty(value).length })}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="mb-8 rounded-3xl border border-cyan-500/20 bg-slate-800/50 p-6">
          <legend className="px-2 text-xl font-bold text-white">{t('circuitBuilder.setup.chooseLevel')}</legend>
          {levels.length === 0 ? (
            <p className="text-center text-sm text-slate-300">{t('circuitBuilder.setup.noLevels')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {levels.map((level, index) => {
                const selected = selectedLevel?.id === level.id
                return (
                  <label key={level.id} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="circuit-level"
                      value={level.id}
                      checked={selected}
                      onChange={() => {
                        setChosenLevelId(level.id)
                      }}
                      className="peer sr-only"
                    />
                    <div
                      className={[
                        'min-h-[44px] rounded-xl border-2 p-3',
                        selected
                          ? 'border-cyan-400 bg-cyan-500/15'
                          : 'border-slate-600/50 bg-slate-700/20 hover:border-cyan-400/50',
                        FOCUS_RING,
                      ].join(' ')}
                    >
                      <p className="text-xs font-semibold text-cyan-200">
                        <span aria-hidden="true">{selected ? '◉ ' : '○ '}</span>
                        {t('circuitBuilder.setup.levelNumber', { n: index + 1 })}
                      </p>
                      <p className="font-bold text-white">{t(levelCopyKey(level.id, 'title'))}</p>
                      <p className="text-sm text-slate-200">
                        {t('circuitBuilder.setup.concept')}: {t(levelCopyKey(level.id, 'goal'))}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>

        <div className="mb-8 text-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={selectedLevel === null}
            className="min-h-[44px] rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 px-10 py-3 text-xl font-bold text-white hover:from-cyan-600 hover:to-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {selectedLevel === null
              ? t('circuitBuilder.setup.selectDifficulty')
              : t('circuitBuilder.setup.startLevel')}
          </button>
        </div>

        <section className="rounded-3xl border border-slate-600/40 bg-slate-800/40 p-6 text-center">
          <h2 className="text-lg font-bold text-white">{t('circuitBuilder.setup.sandboxTitle')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-300">
            {t('circuitBuilder.setup.sandboxDescription')}
          </p>
          <button
            type="button"
            onClick={() => {
              navigate(ROUTES.CIRCUIT_BUILDER_SANDBOX)
            }}
            className="mt-3 min-h-[44px] rounded-xl border border-cyan-500/60 px-6 py-2 text-cyan-100 hover:bg-cyan-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {t('circuitBuilder.setup.sandboxStart')}
          </button>
        </section>
      </div>
    </div>
  )
}
