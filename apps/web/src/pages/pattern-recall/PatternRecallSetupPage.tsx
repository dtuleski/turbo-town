import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  THEMES,
  DIFFICULTIES,
  type PatternRecallTheme,
  type PatternRecallDifficulty,
} from '@/utils/patternRecallUtils'

const THEME_LIST: { id: PatternRecallTheme; icon: string }[] = [
  { id: 'colors', icon: '🎨' },
  { id: 'animals', icon: '🐾' },
  { id: 'musical-notes', icon: '🎵' },
  { id: 'emojis', icon: '😀' },
]

const DIFFICULTY_LIST: { id: PatternRecallDifficulty; emoji: string }[] = [
  { id: 'easy', emoji: '🟢' },
  { id: 'medium', emoji: '🟡' },
  { id: 'hard', emoji: '🔴' },
]

export default function PatternRecallSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedTheme, setSelectedTheme] = useState<PatternRecallTheme | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<PatternRecallDifficulty | null>(null)

  const handleStart = () => {
    if (selectedTheme && selectedDifficulty) {
      navigate(`${ROUTES.PATTERN_RECALL_GAME}?theme=${selectedTheme}&difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🧩 {t('patternRecall.setup.title')}
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow">
            {t('patternRecall.setup.subtitle')}
          </p>
        </div>

        {/* Theme Selection */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            {t('patternRecall.setup.chooseTheme')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {THEME_LIST.map((theme) => {
              const config = THEMES[theme.id]
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                    selectedTheme === theme.id
                      ? 'border-purple-500 bg-purple-50 shadow-xl scale-105'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="text-5xl mb-3">{theme.icon}</div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {t(config.labelKey)}
                  </h3>
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            {t('patternRecall.setup.chooseDifficulty')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTY_LIST.map((diff) => {
              const config = DIFFICULTIES[diff.id]
              return (
                <button
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                    selectedDifficulty === diff.id
                      ? 'border-purple-500 bg-purple-50 shadow-xl scale-105'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="text-5xl mb-3">{diff.emoji}</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {t(config.labelKey)}
                  </h3>
                  <p className="text-gray-600">{t(config.descriptionKey)}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedTheme || !selectedDifficulty}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform ${
              selectedTheme && selectedDifficulty
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-110 shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedTheme && selectedDifficulty
              ? t('patternRecall.setup.startGame')
              : t('patternRecall.setup.selectBoth')}
          </button>
        </div>
      </div>
    </div>
  )
}
