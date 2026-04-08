import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { DIFFICULTY_CONFIG, type BotDifficulty } from '@/utils/codeABotUtils'

const DIFF_OPTIONS: { id: BotDifficulty; emoji: string; desc: string; features: string }[] = [
  { id: 'easy',   emoji: '🟢', desc: '5×5 grid · Simple paths',              features: 'Walls only' },
  { id: 'medium', emoji: '🟡', desc: '6×6 grid · Cracks to jump over',       features: 'Walls + Cracks' },
  { id: 'hard',   emoji: '🔴', desc: '7×7 grid · Cracks + Ice slides',       features: 'Walls + Cracks + Ice' },
]

export default function CodeABotSetupPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<BotDifficulty | ''>('')

  const handleStart = () => {
    if (difficulty) {
      navigate(`${ROUTES.CODE_A_BOT_GAME}?difficulty=${difficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🤖 Code-a-Bot
          </h1>
          <p className="text-xl text-white/80 font-bold">
            Help your robot reach the power cell!
          </p>
          <p className="text-base text-white/60 mt-2">
            Sequence your moves to navigate the maze
          </p>
        </div>

        {/* How to play */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3 text-center">How to Play</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-white/80 text-sm">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">⬆️</div>
              <div className="font-bold">Forward</div>
              <div className="text-xs text-white/50">Move one cell</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">↩️</div>
              <div className="font-bold">Turn Left</div>
              <div className="text-xs text-white/50">Rotate 90°</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">↪️</div>
              <div className="font-bold">Turn Right</div>
              <div className="text-xs text-white/50">Rotate 90°</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">🦘</div>
              <div className="font-bold">Jump</div>
              <div className="text-xs text-white/50">Leap over 1 cell</div>
            </div>
          </div>
        </div>

        {/* Difficulty selection */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFF_OPTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  difficulty === d.id
                    ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">{d.emoji}</div>
                <div className="text-lg font-bold text-white">{DIFFICULTY_CONFIG[d.id].label}</div>
                <div className="text-sm text-white/60 mt-1">{d.desc}</div>
                <div className="text-xs text-cyan-300 mt-2">{d.features}</div>
                <div className="text-xs text-white/40 mt-1">{DIFFICULTY_CONFIG[d.id].levelCount} levels</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!difficulty}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${
              difficulty
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:scale-105 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Coding! 🚀
          </button>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white/60 mb-2 text-center">Grid Legend</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70">
            <span>🤖 Bot</span>
            <span>⚡ Power Cell</span>
            <span>🧱 Wall</span>
            <span>🕳️ Crack (jump over!)</span>
            <span>🧊 Ice (slides you!)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
