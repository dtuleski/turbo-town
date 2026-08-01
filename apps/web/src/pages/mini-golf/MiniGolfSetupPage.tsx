import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { canStartGame } from '@/api/game'
import { COURSES, type Difficulty } from '@/utils/miniGolfData'

const DIFFICULTIES: Array<{ id: Difficulty; emoji: string; descKey: string; nameKey: string }> = [
  { id: 'easy', emoji: '🟢', descKey: 'miniGolf.easyDesc', nameKey: 'game.easy' },
  { id: 'medium', emoji: '🟡', descKey: 'miniGolf.mediumDesc', nameKey: 'game.medium' },
  { id: 'hard', emoji: '🔴', descKey: 'miniGolf.hardDesc', nameKey: 'game.hard' },
]

export default function MiniGolfSetupPage() {
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
      navigate(`${ROUTES.MINI_GOLF_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  const selectedCourse = selectedDifficulty ? COURSES.find(c => c.difficulty === selectedDifficulty) : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-3 drop-shadow-lg">
            ⛳ {t('miniGolf.title')}
          </h1>
          <p className="text-2xl text-emerald-200 font-bold drop-shadow">
            {t('miniGolf.subtitle')}
          </p>
          <p className="text-lg text-slate-400 mt-2 max-w-lg mx-auto">
            {t('miniGolf.description')}
          </p>
          <p className="text-sm text-green-400/80 mt-2">
            🌡️ Wind, temperature & altitude change each hole and affect ball physics!
          </p>
        </div>

        {/* How to Play */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-emerald-500/20">
          <h3 className="text-xl font-bold text-white mb-4 text-center">{t('miniGolf.howToPlay')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center text-slate-200">
            <div className="p-3">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-sm font-medium">{t('miniGolf.step1')}</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">👆</div>
              <p className="text-sm font-medium">{t('miniGolf.step2')}</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">🏌️</div>
              <p className="text-sm font-medium">{t('miniGolf.step3')}</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">🕳️</div>
              <p className="text-sm font-medium">{t('miniGolf.step4')}</p>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 mb-8 border border-emerald-500/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {t('miniGolf.chooseCourse')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTIES.map((diff) => {
              const course = COURSES.find(c => c.difficulty === diff.id)
              return (
                <button
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedDifficulty === diff.id
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-xl scale-105'
                      : 'border-slate-600/40 bg-slate-700/20 hover:border-emerald-400/50'
                  }`}
                >
                  <div className="text-5xl mb-3">{course?.emoji || diff.emoji}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{course?.name || t(diff.nameKey)}</h3>
                  <p className="text-slate-300 text-sm mb-2">{t(diff.descKey)}</p>
                  {course && (
                    <p className="text-emerald-300 text-xs font-medium">{course.holes.length} holes</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Course preview */}
        {selectedCourse && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-emerald-500/20">
            <h3 className="text-lg font-bold text-white mb-3 text-center">
              {selectedCourse.emoji} {selectedCourse.name} — Course Preview
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {selectedCourse.holes.map((hole, i) => (
                <div key={hole.id} className="bg-slate-700/40 rounded-xl p-3 text-center">
                  <div className="text-emerald-400 text-sm font-bold">Hole {i + 1}</div>
                  <div className="text-white text-xs">{hole.name}</div>
                  <div className="text-slate-400 text-xs">Par {hole.par}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedDifficulty}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform ${
              selectedDifficulty
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:scale-110 shadow-xl'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty ? `${t('miniGolf.teeOff')} ⛳` : t('miniGolf.selectCourse')}
          </button>
        </div>
      </div>
    </div>
  )
}
