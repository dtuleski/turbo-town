import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { THEMES, DIFFICULTY_CONFIG, type SeqTheme, type SeqDifficulty } from '@/utils/sequenceMemoryUtils'

const THEME_OPTIONS: { id: SeqTheme; name: string; emoji: string }[] = [
  { id: 'f1-2025', name: 'Formula 1 — 2025', emoji: '🏎️' },
  { id: 'f1-2026', name: 'Formula 1 — 2026', emoji: '🏁' },
]

const DIFF_OPTIONS: { id: SeqDifficulty; emoji: string; desc: string }[] = [
  { id: 'easy', emoji: '🟢', desc: '5 cards · 5s view time' },
  { id: 'medium', emoji: '🟡', desc: '10 cards · 3s view time' },
  { id: 'hard', emoji: '🔴', desc: '15 cards · 2s view time' },
]

export default function SequenceMemorySetupPage() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<SeqTheme | ''>('')
  const [difficulty, setDifficulty] = useState<SeqDifficulty | ''>('')

  const handleStart = () => {
    if (theme && difficulty) {
      navigate(`${ROUTES.SEQUENCE_MEMORY_GAME}?theme=${theme}&difficulty=${difficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🧠 Sequence Memory
          </h1>
          <p className="text-xl text-white/80 font-bold">
            Cards are revealed one by one. Remember the sequence!
          </p>
          <p className="text-base text-white/60 mt-2">
            3 lives · Cards must be recalled in order
          </p>
        </div>

        {/* Theme selection */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Theme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-5 rounded-xl border-2 transition-all ${
                  theme === t.id
                    ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-4xl mb-2">{t.emoji}</div>
                <div className="text-lg font-bold text-white">{t.name}</div>
                <div className="text-sm text-white/60">{THEMES[t.id].drivers.length} drivers</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty selection */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFF_OPTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`p-5 rounded-xl border-2 transition-all ${
                  difficulty === d.id
                    ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className="text-lg font-bold text-white capitalize">{DIFFICULTY_CONFIG[d.id].label}</div>
                <div className="text-sm text-white/60">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!theme || !difficulty}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all ${
              theme && difficulty
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:scale-110 shadow-xl'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {theme && difficulty ? 'Start Challenge 🧠' : 'Select Theme & Difficulty'}
          </button>
        </div>
      </div>
    </div>
  )
}
