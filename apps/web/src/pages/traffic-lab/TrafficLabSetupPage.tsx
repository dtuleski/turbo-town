import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { canStartGame } from '@/api/game'

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES: Array<{ id: Difficulty; emoji: string; nodes: string; desc: string }> = [
  { id: 'easy', emoji: '🟢', nodes: '1 intersection', desc: 'Low traffic, single crossing' },
  { id: 'medium', emoji: '🟡', nodes: '2 intersections', desc: 'More cars, coordinate two lights' },
  { id: 'hard', emoji: '🔴', nodes: '4 intersections', desc: 'Heavy traffic, 2×2 grid!' },
]

export default function TrafficLabSetupPage() {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | ''>('')

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await canStartGame()
        const tier = result?.rateLimit?.tier
        if (!tier || tier === 'FREE') {
          navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true }, replace: true })
        }
      } catch {}
    }
    checkAccess()
  }, [navigate])

  const handleStart = () => {
    if (selectedDifficulty) {
      navigate(`${ROUTES.TRAFFIC_LAB_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-gray-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-3 drop-shadow-lg">
            🚦 Traffic Systems Lab
          </h1>
          <p className="text-2xl text-amber-200 font-bold drop-shadow">
            Control the Flow
          </p>
          <p className="text-lg text-slate-400 mt-2 max-w-lg mx-auto">
            Click intersections to change traffic lights. Keep cars moving to maximize throughput — but prevent crashes!
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-amber-500/20">
          <h3 className="text-xl font-bold text-white mb-4 text-center">How to Play</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-slate-200">
            <div className="p-3">
              <div className="text-3xl mb-2">👆</div>
              <p className="text-sm font-medium">Click an intersection to toggle its traffic lights</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">🚗</div>
              <p className="text-sm font-medium">Cars flow through — maximize throughput for points</p>
            </div>
            <div className="p-3">
              <div className="text-3xl mb-2">💥</div>
              <p className="text-sm font-medium">3 crashes and the system shuts down!</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 mb-8 border border-amber-500/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  selectedDifficulty === diff.id
                    ? 'border-amber-400 bg-amber-500/20 shadow-xl scale-105'
                    : 'border-slate-600/40 bg-slate-700/20 hover:border-amber-400/50'
                }`}
              >
                <div className="text-5xl mb-3">{diff.emoji}</div>
                <h3 className="text-xl font-bold text-white mb-1">{diff.nodes}</h3>
                <p className="text-slate-300 text-sm">{diff.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedDifficulty}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform ${
              selectedDifficulty
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:scale-110 shadow-xl'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty ? 'Start Simulation 🚦' : 'Select a difficulty'}
          </button>
        </div>
      </div>
    </div>
  )
}
