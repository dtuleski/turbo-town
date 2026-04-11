import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { DIFFICULTY_MODES, type GameMode } from '@/utils/geoQuizData'

type Difficulty = 'easy' | 'medium' | 'hard'

export default function GeoQuizSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [mode, setMode] = useState<GameMode | ''>('')

  const DIFFICULTIES: { id: Difficulty; emoji: string; label: string }[] = [
    { id: 'easy', emoji: '🟢', label: t('game.easy') },
    { id: 'medium', emoji: '🟡', label: t('game.medium') },
    { id: 'hard', emoji: '🔴', label: t('game.hard') },
  ]

  const MODE_INFO: Record<GameMode, { icon: string; label: string }> = {
    capitals: { icon: '🏛️', label: t('setup.geoModes.capitals') },
    flags: { icon: '🏁', label: t('setup.geoModes.flags') },
    states: { icon: '📍', label: t('setup.geoModes.usStates') },
    silhouettes: { icon: '🗺️', label: t('setup.geoModes.silhouettes') },
    continents: { icon: '🌍', label: t('setup.geoModes.continents') },
  }

  const availableModes = difficulty ? DIFFICULTY_MODES[difficulty] : []

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d)
    const modes = DIFFICULTY_MODES[d]
    setMode(modes.length === 1 ? modes[0] : '')
  }

  const handleStart = () => {
    if (difficulty && mode) {
      navigate(`${ROUTES.GEO_QUIZ_GAME}?difficulty=${difficulty}&mode=${mode}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🌍 {t('setup.geoQuiz.title')}
          </h1>
          <p className="text-xl text-white/80 font-bold">
            {t('setup.geoQuiz.subtitle')}
          </p>
          <p className="text-base text-white/60 mt-2">
            {t('setup.geoQuiz.info')}
          </p>
        </div>

        {/* Difficulty selection */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">{t('game.chooseDifficulty')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => handleDifficultyChange(d.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  difficulty === d.id
                    ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className="text-lg font-bold text-white">{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Game mode selection */}
        {difficulty && availableModes.length > 1 && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 text-center">{t('game.chooseGameMode')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {availableModes.map((m) => {
                const info = MODE_INFO[m]
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      mode === m
                        ? 'border-yellow-400 bg-white/20 scale-105'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    <div className="text-2xl mb-1">{info.icon}</div>
                    <div className="font-bold text-white text-sm">{info.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Start button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!difficulty || !mode}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${
              difficulty && mode
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {difficulty && mode ? t('game.startQuiz') : t('game.selectDifficultyAndMode')}
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white/60 mb-2 text-center">{t('setup.geoQuiz.howItWorks')}</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70">
            <span>📝 {t('setup.geoQuiz.questionsLabel')}</span>
            <span>⏱️ {t('setup.geoQuiz.timerPerQ')}</span>
            <span>💡 {t('setup.geoQuiz.hintsAfter')}</span>
            <span>🔥 {t('setup.geoQuiz.streakBonuses')}</span>
            <span>🎉 {t('setup.geoQuiz.funFacts')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
