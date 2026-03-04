import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES, GAME_THEMES, DIFFICULTY_LEVELS } from '@/config/constants'
import type { GameTheme, DifficultyLevel } from '@/types/game'
import Button from '@/components/common/Button'

const GameSetupPage = () => {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<GameTheme>('ANIMALS')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('EASY')

  const handleStartGame = () => {
    // Store game settings and navigate to game
    navigate(ROUTES.GAME, { state: { theme, difficulty } })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8">Let's Play! 🎮</h1>

      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-4">Choose Your Theme</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {GAME_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`card-hover text-center p-6 ${
                theme === t.id ? 'ring-2 ring-primary-blue' : ''
              }`}
            >
              <div className="text-4xl mb-2">{t.emoji}</div>
              <div className="font-medium">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-4">Choose Difficulty</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DIFFICULTY_LEVELS.map(d => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`card-hover text-left p-6 ${
                difficulty === d.id ? 'ring-2 ring-primary-blue' : ''
              }`}
            >
              <div className="font-bold text-lg mb-2">{d.name}</div>
              <div className="text-text-secondary text-sm">{d.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button size="lg" onClick={handleStartGame}>
          Start Game 🚀
        </Button>
      </div>
    </div>
  )
}

export default GameSetupPage
