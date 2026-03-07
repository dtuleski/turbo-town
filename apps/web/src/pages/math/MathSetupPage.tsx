import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    name: 'Easy',
    emoji: '🟢',
    description: 'Addition & Subtraction',
    questions: 10,
    timeLimit: 120, // 2 minutes
    operations: ['addition', 'subtraction'],
  },
  {
    id: 'medium',
    name: 'Medium',
    emoji: '🟡',
    description: 'All Basic Operations',
    questions: 15,
    timeLimit: 180, // 3 minutes
    operations: ['addition', 'subtraction', 'multiplication', 'division'],
  },
  {
    id: 'hard',
    name: 'Hard',
    emoji: '🔴',
    description: 'Advanced Math',
    questions: 20,
    timeLimit: 240, // 4 minutes
    operations: ['addition', 'subtraction', 'multiplication', 'division', 'power', 'root'],
  },
]

export default function MathSetupPage() {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')

  const handleStart = () => {
    if (selectedDifficulty) {
      navigate(`${ROUTES.MATH_GAME}?difficulty=${selectedDifficulty}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🔢 Math Challenge
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow">
            Test your math skills! Solve problems as fast as you can!
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Choose Your Level
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`
                  p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105
                  ${
                    selectedDifficulty === level.id
                      ? 'border-blue-500 bg-blue-50 shadow-xl scale-105'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }
                `}
              >
                <div className="text-6xl mb-3">{level.emoji}</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{level.name}</h3>
                <p className="text-gray-600 mb-3">{level.description}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📝 {level.questions} questions</p>
                  <p>⏱️ {level.timeLimit / 60} minutes</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedDifficulty}
            className={`
              px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform
              ${
                selectedDifficulty
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 hover:scale-110 shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {selectedDifficulty ? 'Start Challenge! 🚀' : 'Select a Level'}
          </button>
        </div>
      </div>
    </div>
  )
}
