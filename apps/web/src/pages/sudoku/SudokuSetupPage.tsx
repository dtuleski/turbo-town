import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    name: 'Easy',
    emoji: '🟢',
    description: '45 numbers given',
    detail: 'Great for beginners',
  },
  {
    id: 'medium',
    name: 'Medium',
    emoji: '🟡',
    description: '35 numbers given',
    detail: 'A solid challenge',
  },
  {
    id: 'hard',
    name: 'Hard',
    emoji: '🔴',
    description: '27 numbers given',
    detail: 'For Sudoku pros',
  },
]

export default function SudokuSetupPage() {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')

  const handleStart = () => {
    if (selectedDifficulty) {
      navigate(`${ROUTES.SUDOKU_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🧩 Sudoku
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow">
            Fill the grid so every row, column, and box has 1–9!
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Choose Your Level
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                  selectedDifficulty === level.id
                    ? 'border-purple-500 bg-purple-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-purple-300'
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
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:scale-110 shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty ? 'Start Puzzle! 🧩' : 'Select a Level'}
          </button>
        </div>
      </div>
    </div>
  )
}
