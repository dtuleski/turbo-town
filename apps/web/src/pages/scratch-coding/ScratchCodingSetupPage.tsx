import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DIFFICULTY_CONFIG, type Difficulty } from '@/utils/scratchCodingUtils'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export default function ScratchCodingSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Difficulty | ''>('')

  const handleStart = () => {
    if (selected) {
      navigate(`/scratch-coding/game?difficulty=${selected}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🧩 {t('scratchCoding.title')}
          </h1>
          <p className="text-xl text-white/80 font-bold">
            {t('scratchCoding.subtitle')}
          </p>
        </div>

        {/* How to Play */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            {t('scratchCoding.howToPlay')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-4xl mb-2">🧱</div>
              <p className="text-white/80 text-sm font-medium">
                {t('scratchCoding.howToPlayStep1', 'Drag code blocks from the palette into the editor')}
              </p>
            </div>
            <div className="p-4">
              <div className="text-4xl mb-2">🔗</div>
              <p className="text-white/80 text-sm font-medium">
                {t('scratchCoding.howToPlayStep2', 'Snap blocks together to build your program')}
              </p>
            </div>
            <div className="p-4">
              <div className="text-4xl mb-2">▶️</div>
              <p className="text-white/80 text-sm font-medium">
                {t('scratchCoding.howToPlayStep3', 'Press Run and watch your character follow the instructions!')}
              </p>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            {t('scratchCoding.chooseDifficulty')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTIES.map((d) => {
              const config = DIFFICULTY_CONFIG[d]
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${
                    selected === d
                      ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <div className="text-3xl mb-2">{config.emoji}</div>
                  <div className="text-lg font-bold text-white">
                    {t(`scratchCoding.difficulty.${d}.label`, config.label)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">
                    {t(`scratchCoding.difficulty.${d}.desc`, config.description)}
                  </div>
                  <div className="text-xs text-white/40 mt-2">
                    {t(`scratchCoding.difficulty.${d}.features`, config.availableCategories.join(' + '))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selected}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${
              selected
                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:scale-105 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {selected ? t('scratchCoding.startCoding') : t('scratchCoding.chooseDifficulty')}
          </button>
        </div>
      </div>
    </div>
  )
}
