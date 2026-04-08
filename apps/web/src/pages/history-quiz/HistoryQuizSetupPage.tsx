import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { HISTORY_GAME_MODES, DIFFICULTY_MODES, type HistoryGameMode } from '@/utils/historyQuizData'

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES: { id: Difficulty; emoji: string; label: string; desc: string; timer: string }[] = [
  { id: 'easy', emoji: '🟢', label: 'Easy', desc: 'Famous quotes & events', timer: '20s per question' },
  { id: 'medium', emoji: '🟡', label: 'Medium', desc: 'Events + When did it happen?', timer: '15s per question' },
  { id: 'hard', emoji: '🔴', label: 'Hard', desc: 'All modes + obscure events', timer: '12s per question' },
]

export default function HistoryQuizSetupPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [mode, setMode] = useState<HistoryGameMode | ''>('')

  const availableModes = difficulty ? DIFFICULTY_MODES[difficulty] : []

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d)
    const modes = DIFFICULTY_MODES[d]
    setMode(modes.length === 1 ? modes[0] : '')
  }

  const handleStart = () => {
    if (difficulty && mode) {
      navigate(`${ROUTES.HISTORY_QUIZ_GAME}?difficulty=${difficulty}&mode=${mode}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">📜 History Quiz</h1>
          <p className="text-xl text-white/80 font-bold">Famous quotes, events & people through the ages</p>
          <p className="text-base text-white/60 mt-2">10 questions · Images · Fun facts after each answer</p>
        </div>

        {/* Difficulty */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => handleDifficultyChange(d.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${difficulty === d.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className="text-lg font-bold text-white">{d.label}</div>
                <div className="text-sm text-white/60 mt-1">{d.desc}</div>
                <div className="text-xs text-amber-300 mt-2">⏱️ {d.timer}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Game mode */}
        {difficulty && availableModes.length > 1 && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Choose Game Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {availableModes.map((m) => {
                const info = HISTORY_GAME_MODES[m]
                return (
                  <button key={m} onClick={() => setMode(m)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${mode === m ? 'border-yellow-400 bg-white/20 scale-105' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                    <div className="text-2xl mb-1">{info.icon}</div>
                    <div className="font-bold text-white text-sm">{info.label}</div>
                    <div className="text-xs text-white/50 mt-1">{info.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Start */}
        <div className="text-center">
          <button onClick={handleStart} disabled={!difficulty || !mode}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${difficulty && mode ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105 cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {difficulty && mode ? 'Start Quiz! 🚀' : 'Select Difficulty & Mode'}
          </button>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white/60 mb-2 text-center">What You\'ll Learn</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70">
            <span>⚔️ Wars & Battles</span>
            <span>🎤 Famous Speeches</span>
            <span>💡 Inventions</span>
            <span>🌍 Exploration</span>
            <span>🏛️ Politics</span>
            <span>🔬 Science</span>
          </div>
        </div>
      </div>
    </div>
  )
}
