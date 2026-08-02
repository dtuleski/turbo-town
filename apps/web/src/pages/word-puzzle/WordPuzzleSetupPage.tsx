import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'

export default function WordPuzzleSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const difficulties = [
    {
      id: 'easy',
      name: t('wordPuzzle.easy'),
      emoji: '🟢',
      gridSize: '10x10',
      words: 6,
      timeLimit: `5 ${t('wordPuzzle.minutes')}`,
      description: t('wordPuzzle.easyDesc'),
    },
    {
      id: 'medium',
      name: t('wordPuzzle.medium'),
      emoji: '🟡',
      gridSize: '12x12',
      words: 8,
      timeLimit: `7 ${t('wordPuzzle.minutes')}`,
      description: t('wordPuzzle.mediumDesc'),
    },
    {
      id: 'hard',
      name: t('wordPuzzle.hard'),
      emoji: '🔴',
      gridSize: '15x15',
      words: 10,
      timeLimit: `10 ${t('wordPuzzle.minutes')}`,
      description: t('wordPuzzle.hardDesc'),
    },
  ]

  const handleStart = (difficulty: string) => {
    navigate(`${ROUTES.WORD_PUZZLE_GAME}?difficulty=${difficulty}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
            {t('wordPuzzle.title')}
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow">
            {t('wordPuzzle.subtitle')}
          </p>
        </div>

        {/* How to Play */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            {t('wordPuzzle.howToPlay')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
            <div className="text-center">
              <div className="text-4xl mb-3">👆</div>
              <h3 className="font-bold text-xl mb-2">{t('wordPuzzle.selectLetters')}</h3>
              <p className="text-sm">{t('wordPuzzle.selectLettersDesc')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-bold text-xl mb-2">{t('wordPuzzle.findWords')}</h3>
              <p className="text-sm">{t('wordPuzzle.findWordsDesc')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⏱️</div>
              <h3 className="font-bold text-xl mb-2">{t('wordPuzzle.beatTheClock')}</h3>
              <p className="text-sm">{t('wordPuzzle.beatTheClockDesc')}</p>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {difficulties.map((diff) => (
            <div
              key={diff.id}
              className="bg-white rounded-3xl shadow-2xl p-8 hover:scale-105 transition-transform"
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">{diff.emoji}</div>
                <h3 className="text-3xl font-bold text-gray-800 mb-2">{diff.name}</h3>
                <p className="text-gray-600">{diff.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('wordPuzzle.gridSize')}:</span>
                  <span className="font-bold text-gray-800">{diff.gridSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('wordPuzzle.words')}:</span>
                  <span className="font-bold text-gray-800">{diff.words}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('wordPuzzle.timeLimit')}:</span>
                  <span className="font-bold text-gray-800">{diff.timeLimit}</span>
                </div>
              </div>

              <button
                onClick={() => handleStart(diff.id)}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                {t('wordPuzzle.start')} {diff.name}
              </button>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => navigate(ROUTES.HUB)}
            className="px-8 py-3 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all"
          >
            {t('wordPuzzle.backToGames')}
          </button>
        </div>
      </div>
    </div>
  )
}
