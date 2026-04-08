import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

type Difficulty = 'easy' | 'medium' | 'hard'

const LEVELS = [
  { id: 'easy' as Difficulty, emoji: '🟢', label: 'Easy', desc: 'Random AI', detail: 'Great for beginners' },
  { id: 'medium' as Difficulty, emoji: '🟡', label: 'Medium', desc: 'Smart AI', detail: 'Blocks your wins' },
  { id: 'hard' as Difficulty, emoji: '🔴', label: 'Hard', desc: 'Perfect AI', detail: 'Impossible to beat — try to draw!' },
]

export default function TicTacToeSetupPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">❌⭕ Tic Tac Toe</h1>
          <p className="text-xl text-white/80 font-bold">Challenge the AI — Best of 5 rounds!</p>
          <p className="text-base text-white/60 mt-2">You are X · AI is O · Win, draw, or lose each round</p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose AI Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => setDifficulty(l.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${difficulty === l.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                <div className="text-3xl mb-2">{l.emoji}</div>
                <div className="text-lg font-bold text-white">{l.label}</div>
                <div className="text-sm text-white/60 mt-1">{l.desc}</div>
                <div className="text-xs text-purple-300 mt-2">{l.detail}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button onClick={() => difficulty && navigate(`${ROUTES.TIC_TAC_TOE_GAME}?difficulty=${difficulty}`)}
            disabled={!difficulty}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${difficulty ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:scale-105 cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {difficulty ? 'Start Game! ❌⭕' : 'Select Difficulty'}
          </button>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4 text-center">
          <div className="text-sm text-white/50">🏆 Win = 300pts · 🤝 Draw = 100pts · 💀 Lose = 0pts · Faster = bonus points</div>
        </div>
      </div>
    </div>
  )
}
