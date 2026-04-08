import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Easy', emoji: '🟢', description: 'Simple 3-4 letter words', detail: 'CAT, DOG, FISH...' },
  { id: 'medium', name: 'Medium', emoji: '🟡', description: '5-6 letter words', detail: 'GUITAR, CASTLE, DRAGON...' },
  { id: 'hard', name: 'Hard', emoji: '🔴', description: '7-10 letter words', detail: 'ELEPHANT, BUTTERFLY...' },
]

export default function BubblePopSetupPage() {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState('')

  const handleStart = () => {
    if (selectedDifficulty) {
      navigate(`${ROUTES.BUBBLE_POP_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-rose-400 to-orange-400 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🫧 Bubble Pop Spelling
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow">
            Pop the bubbles in the right order to spell the word!
          </p>
          <p className="text-lg text-white/80 mt-2">
            5 rounds • 3 lives • Don't pop the wrong letter!
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Choose Your Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                  selectedDifficulty === level.id
                    ? 'border-rose-500 bg-rose-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-rose-300'
                }`}
              >
                <div className="text-6xl mb-3">{level.emoji}</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{level.name}</h3>
                <p className="text-gray-600 mb-1">{level.description}</p>
                <p className="text-sm text-gray-500">{level.detail}</p>
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
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:scale-110 shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty ? 'Start Popping! 🫧' : 'Select a Level'}
          </button>
        </div>
      </div>
    </div>
  )
}
