import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

type Difficulty = 'easy' | 'medium' | 'hard'

const LEVELS = [
  { id: 'easy' as Difficulty, emoji: '🟢', label: 'Easy', desc: 'Up to 5 letters', detail: '5 rounds · Short words' },
  { id: 'medium' as Difficulty, emoji: '🟡', label: 'Medium', desc: '6-10 letters', detail: '5 rounds · Longer words' },
  { id: 'hard' as Difficulty, emoji: '🔴', label: 'Hard', desc: '11+ letters', detail: '5 rounds · Challenge words' },
]

export default function HangmanSetupPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">🪢 Hangman</h1>
          <p className="text-xl text-white/80 font-bold">Guess the word before the hangman is complete!</p>
          <p className="text-base text-white/60 mt-2">6 wrong guesses allowed · Hints provided · 5 rounds per game</p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => setDifficulty(l.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${difficulty === l.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                <div className="text-3xl mb-2">{l.emoji}</div>
                <div className="text-lg font-bold text-white">{l.label}</div>
                <div className="text-sm text-white/60 mt-1">{l.desc}</div>
                <div className="text-xs text-slate-400 mt-2">{l.detail}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button onClick={() => difficulty && navigate(`${ROUTES.HANGMAN_GAME}?difficulty=${difficulty}`)}
            disabled={!difficulty}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${difficulty ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white hover:scale-105 cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {difficulty ? 'Start Game! 🪢' : 'Select Difficulty'}
          </button>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4 text-center">
          <div className="text-sm text-white/50">💡 Each word comes with a hint and category · Fewer wrong guesses = higher score</div>
        </div>
      </div>
    </div>
  )
}
