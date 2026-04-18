import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import type { SpaceEntryDifficulty } from '@/utils/spaceEntryConfig'

const DIFFICULTY_LEVELS: Array<{
  id: SpaceEntryDifficulty
  emoji: string
  nameKey: string
  descKey: string
}> = [
  { id: 'easy', emoji: '🟢', nameKey: 'game.easy', descKey: 'spaceEntry.easyDesc' },
  { id: 'medium', emoji: '🟡', nameKey: 'game.medium', descKey: 'spaceEntry.mediumDesc' },
  { id: 'hard', emoji: '🔴', nameKey: 'game.hard', descKey: 'spaceEntry.hardDesc' },
]

export default function SpaceEntrySetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState<SpaceEntryDifficulty | ''>('')

  const handleStart = () => {
    if (selectedDifficulty) {
      navigate(`${ROUTES.SPACE_ENTRY_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🚀 {t('spaceEntry.title')}
          </h1>
          <p className="text-2xl text-purple-200 font-bold drop-shadow">
            {t('spaceEntry.subtitle')}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            {t('spaceEntry.chooseDifficulty')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                  selectedDifficulty === level.id
                    ? 'border-purple-400 bg-purple-500/30 shadow-xl scale-105'
                    : 'border-white/20 bg-white/5 hover:border-purple-400/50'
                }`}
              >
                <div className="text-6xl mb-3">{level.emoji}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{t(level.nameKey)}</h3>
                <p className="text-purple-200">{t(level.descKey)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedDifficulty}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform ${
              selectedDifficulty
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:scale-110 shadow-xl'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty ? `${t('spaceEntry.startMission')} 🚀` : t('spaceEntry.selectDifficulty')}
          </button>
        </div>
      </div>
    </div>
  )
}
