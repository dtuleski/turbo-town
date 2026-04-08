import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { PUZZLE_IMAGES, generatePuzzleImageSVG } from '@/utils/puzzleUtils'

const DIFFICULTY_LEVELS = [
  { id: 'easy', name: 'Easy', emoji: '🟢', description: '3×3 grid (9 pieces)', detail: 'Great for beginners' },
  { id: 'medium', name: 'Medium', emoji: '🟡', description: '4×4 grid (16 pieces)', detail: 'A fun challenge' },
  { id: 'hard', name: 'Hard', emoji: '🔴', description: '5×5 grid (25 pieces)', detail: 'For puzzle masters' },
]

export default function PuzzleSetupPage() {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedImage, setSelectedImage] = useState('')

  const handleStart = () => {
    if (selectedDifficulty && selectedImage) {
      navigate(`${ROUTES.PUZZLE_GAME}?difficulty=${selectedDifficulty}&image=${selectedImage}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🧩 Jigsaw Puzzle
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow">
            Drag and drop pieces to complete the picture!
          </p>
        </div>

        {/* Difficulty */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Choose Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level.id)}
                className={`p-6 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                  selectedDifficulty === level.id
                    ? 'border-teal-500 bg-teal-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-teal-300'
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

        {/* Image Selection */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Choose an Image</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PUZZLE_IMAGES.map((img) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(img.id)}
                className={`p-3 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                  selectedImage === img.id
                    ? 'border-teal-500 bg-teal-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-teal-300'
                }`}
              >
                <img
                  src={generatePuzzleImageSVG(img.id, 200)}
                  alt={img.name}
                  className="w-full aspect-square rounded-xl mb-2 object-cover"
                />
                <p className="text-center font-bold text-gray-700">
                  {img.emoji} {img.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={!selectedDifficulty || !selectedImage}
            className={`px-12 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 transform ${
              selectedDifficulty && selectedImage
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:scale-110 shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedDifficulty && selectedImage ? 'Start Puzzle! 🧩' : 'Select Difficulty & Image'}
          </button>
        </div>
      </div>
    </div>
  )
}
