import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { CIVICS_CATEGORIES, type CivicsCategory } from '@/utils/civicsQuizData'

const CATEGORIES: { id: CivicsCategory; emoji: string; count: string }[] = [
  { id: 'all', emoji: '📋', count: '100 questions' },
  { id: 'government', emoji: '🏛️', count: '~45 questions' },
  { id: 'history', emoji: '📜', count: '~25 questions' },
  { id: 'civics', emoji: '🗺️', count: '~13 questions' },
]

const LEVELS = [
  { id: 'easy', emoji: '🟢', label: 'Easy', questions: 6, desc: '6 questions · Like the real test minimum' },
  { id: 'medium', emoji: '🟡', label: 'Medium', questions: 10, desc: '10 questions · Full test simulation' },
  { id: 'hard', emoji: '🔴', label: 'Hard', questions: 20, desc: '20 questions · Deep knowledge check' },
]

export default function CivicsQuizSetupPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<CivicsCategory | ''>('')
  const [level, setLevel] = useState('')

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
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">🇺🇸 Civics Quiz</h1>
          <p className="text-xl text-white/80 font-bold">Master the official US Citizenship Test</p>
          <p className="text-base text-white/60 mt-2">Based on the USCIS 100 Civics Questions</p>
        </div>

        {/* Topic */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose a Topic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((c) => {
              const info = CIVICS_CATEGORIES[c.id]
              return (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${category === c.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  <div className="text-3xl mb-2">{c.emoji}</div>
                  <div className="text-lg font-bold text-white">{info.label}</div>
                  <div className="text-sm text-white/60 mt-1">{info.description}</div>
                  <div className="text-xs text-blue-300 mt-2">📝 {c.count}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty */}
        {category && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Difficulty</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => setLevel(l.id)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${level === l.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  <div className="text-3xl mb-2">{l.emoji}</div>
                  <div className="text-lg font-bold text-white">{l.label}</div>
                  <div className="text-sm text-white/60 mt-1">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button onClick={handleStart} disabled={!category || !level}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${category && level ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:scale-105 cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {category && level ? 'Start Quiz! 🚀' : 'Select Topic & Difficulty'}
          </button>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70">
            <span>🏛️ Government</span><span>📜 History</span><span>🗺️ Geography</span>
            <span>🇺🇸 Symbols</span><span>🎉 Holidays</span><span>⚖️ Rights</span>
          </div>
          <p className="text-center text-xs text-white/40 mt-3">Based on the official USCIS naturalization test (rev. 01/19)</p>
        </div>
      </div>
    </div>
  )
}
