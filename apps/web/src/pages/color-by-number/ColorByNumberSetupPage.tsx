import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { PHOTO_DESIGNS, DIFFICULTY_CONFIG } from '@/utils/colorByNumberData'

type Difficulty = 'easy' | 'medium' | 'hard'

export default function ColorByNumberSetupPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [designId, setDesignId] = useState('')

  const handleStart = () => {
    if (difficulty && designId) {
      navigate(`${ROUTES.COLOR_BY_NUMBER_GAME}?difficulty=${difficulty}&design=${designId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">🎨 Color by Number</h1>
          <p className="text-xl text-white/80 font-bold">Paint real photos pixel by pixel!</p>
          <p className="text-base text-white/60 mt-2">Select a color, drag to paint · Faster = higher score</p>
        </div>

        {/* Difficulty */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
              const cfg = DIFFICULTY_CONFIG[d]
              return (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${difficulty === d ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  <div className="text-3xl mb-2">{cfg.emoji}</div>
                  <div className="text-lg font-bold text-white">{cfg.label}</div>
                  <div className="text-sm text-white/60 mt-1">{cfg.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Photo picker */}
        {difficulty && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose a Photo</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {PHOTO_DESIGNS.map((d) => (
                <button key={d.id} onClick={() => setDesignId(d.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${designId === d.id ? 'border-yellow-400 bg-white/20 scale-105 shadow-lg' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  <div className="text-5xl mb-2">{d.emoji}</div>
                  <div className="text-xs font-bold text-white">{d.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button onClick={handleStart} disabled={!difficulty || !designId}
            className={`px-10 py-4 text-xl font-black rounded-2xl transition-all shadow-lg ${difficulty && designId ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {difficulty && designId ? 'Start Painting! 🎨' : 'Select Difficulty & Photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
