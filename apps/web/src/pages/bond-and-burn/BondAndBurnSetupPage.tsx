import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { canStartGame } from '@/api/game'

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES: Array<{ id: Difficulty; emoji: string; descKey: string; nameKey: string }> = [
  { id: 'easy', emoji: '🟢', descKey: 'bondAndBurn.easyDesc', nameKey: 'game.easy' },
  { id: 'medium', emoji: '🟡', descKey: 'bondAndBurn.mediumDesc', nameKey: 'game.medium' },
  { id: 'hard', emoji: '🔴', descKey: 'bondAndBurn.hardDesc', nameKey: 'game.hard' },
]

export default function BondAndBurnSetupPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | ''>('')

  // Premium gate check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await canStartGame()
        const tier = result?.rateLimit?.tier
        if (!tier || tier === 'FREE') {
          navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true }, replace: true })
        }
      } catch {
        // Let backend startGame handle access
      }
    }
    checkAccess()
  }, [navigate])

  const handleStart = () => {
    if (selectedDifficulty) {
      navigate(`${ROUTES.BOND_AND_BURN_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-3 drop-shadow-lg">
            🧪 {t('bondAndBurn.title')}
          </h1>
          <p className="text-2xl text-indigo-200 font-bold drop-shadow">
            {t('bondAndBurn.subtitle')}
          </p>
          <p className="text-lg text-slate-400 mt-2 max-w-lg mx-auto">
            {t('bondAndBurn.description')}
          </p>
        </div>

        {/* How to Play */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-indigo-500/20">
          <h3 className="text-xl font-bold text-white mb-4 text-center">{t('bondAndBurn.howToPlay')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center text-slate-200">
            <div className="p-3">
              <div className="text-3xl mb-2">📖</div>
              <p className="text-sm font-medium">{t('bondAndBurn.step1')}</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">👆</div>
              <p className="text-sm font-medium">{t('bondAndBurn.step2')}</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">🌡️</div>
              <p className="text-sm font-medium">{t('bondAndBurn.step3')}</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="text-sm font-medium">{t('bondAndBurn.step4')}</p>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 mb-8 border border-indigo-500/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {t('bondAndBurn.chooseDifficulty')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTIES.map((diff) => {
              return (
                <button
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedDifficulty === diff.id
                      ? 'border-indigo-400 bg-indigo-500/20 shadow-xl scale-105'
                      : 'border-slate-600/40 bg-slate-700/20 hover:border-indigo-400/50'
                  }`}
                >
                  <div className="text-5xl mb-3">{diff.emoji}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{t(diff.nameKey)}</h3>
                  <p className="text-slate-300 text-sm">{t(diff.descKey)}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedDifficulty}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform ${
              selectedDifficulty
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:scale-110 shadow-xl'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty ? `${t('bondAndBurn.startMission')} 🚀` : t('bondAndBurn.selectDifficulty')}
          </button>
        </div>
      </div>
    </div>
  )
}
