import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { type CivicsCategory } from '@/utils/civicsQuizData'

export default function CivicsQuizSetupPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [category, setCategory] = useState<CivicsCategory | ''>('')
  const [level, setLevel] = useState('')

  const CATEGORIES: { id: CivicsCategory; emoji: string; label: string; description: string; count: string }[] = [
    { id: 'all', emoji: '📋', label: t('setup.civicsQuiz.allTopics'), description: t('setup.civicsQuiz.allTopicsDesc'), count: '100 ' + t('setup.civicsQuiz.questions') },
    { id: 'government', emoji: '🏛️', label: t('setup.civicsQuiz.americanGov'), description: t('setup.civicsQuiz.americanGovDesc'), count: '45 ' + t('setup.civicsQuiz.questions') },
    { id: 'history', emoji: '📜', label: t('setup.civicsQuiz.americanHistory'), description: t('setup.civicsQuiz.americanHistoryDesc'), count: '25 ' + t('setup.civicsQuiz.questions') },
    { id: 'civics', emoji: '🗺️', label: t('setup.civicsQuiz.integratedCivics'), description: t('setup.civicsQuiz.integratedCivicsDesc'), count: '13 ' + t('setup.civicsQuiz.questions') },
  ]

  const LEVELS = [
    { id: 'easy', emoji: '🟢', label: t('game.easy'), questions: 6 },
    { id: 'medium', emoji: '🟡', label: t('game.medium'), questions: 10 },
    { id: 'hard', emoji: '🔴', label: t('game.hard'), questions: 20 },
  ]

  const handleStart = () => {
    if (category && level) {
      const q = LEVELS.find(l => l.id === level)!.questions
      navigate(`${ROUTES.CIVICS_QUIZ_GAME}?category=${category}&questions=${q}&level=${level}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">🇺🇸 {t('setup.civicsQuiz.title')}</h1>
          <p className="text-xl text-white/80 font-bold">{t('setup.civicsQuiz.subtitle')}</p>
          <p className="text-base text-white/60 mt-2">{t('setup.civicsQuiz.based')}</p>
          {i18n.language !== 'en' && (
            <div className="mt-3 inline-block bg-yellow-500/20 text-yellow-300 text-sm font-bold px-4 py-1.5 rounded-full">
              {t('gameplay.englishOnlyBadge')}
            </div>
          )}
        </div>

        {/* Topic */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">{t('game.chooseTopic')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${category === c.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                <div className="text-3xl mb-2">{c.emoji}</div>
                <div className="text-lg font-bold text-white">{c.label}</div>
                <div className="text-sm text-white/60 mt-1">{c.description}</div>
                <div className="text-xs text-blue-300 mt-2">📝 {c.count}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        {category && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">{t('game.chooseDifficulty')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => setLevel(l.id)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${level === l.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  <div className="text-3xl mb-2">{l.emoji}</div>
                  <div className="text-lg font-bold text-white">{l.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button onClick={handleStart} disabled={!category || !level}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${category && level ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:scale-105 cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {category && level ? t('game.startQuiz') : t('game.selectTopicAndDifficulty')}
          </button>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4 text-center">
          <div className="text-sm text-white/50">📋 {t('setup.civicsQuiz.aboutQuiz')}</div>
        </div>
      </div>
    </div>
  )
}
