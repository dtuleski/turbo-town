import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES, GAME_THEMES, DIFFICULTY_LEVELS } from '@/config/constants'
import type { GameTheme, DifficultyLevel } from '@/types/game'
import Button from '@/components/common/Button'

const THEME_KEYS: Record<string, string> = {
  ANIMALS: 'setup.memoryMatch.animals',
  FRUITS: 'setup.memoryMatch.fruits',
  VEHICLES: 'setup.memoryMatch.vehicles',
  SPACE: 'setup.memoryMatch.space',
  OCEAN: 'setup.memoryMatch.ocean',
  FORMULA1: 'setup.memoryMatch.formula1',
}

const DIFF_DESC_KEYS: Record<string, string> = {
  EASY: 'setup.memoryMatch.easyDesc',
  MEDIUM: 'setup.memoryMatch.mediumDesc',
  HARD: 'setup.memoryMatch.hardDesc',
}

const DIFF_NAME_KEYS: Record<string, string> = {
  EASY: 'game.easy',
  MEDIUM: 'game.medium',
  HARD: 'game.hard',
}

const GameSetupPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<GameTheme>('ANIMALS')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('EASY')

  const handleStartGame = () => {
    navigate(ROUTES.GAME, { state: { theme, difficulty } })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8">{t('setup.memoryMatch.letsPlay')}</h1>

      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-4">{t('setup.memoryMatch.chooseTheme')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GAME_THEMES.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={`card-hover text-center p-6 ${theme === th.id ? 'ring-2 ring-primary-blue' : ''}`}
            >
              <div className="text-4xl mb-2">{th.emoji}</div>
              <div className="font-medium">{t(THEME_KEYS[th.id] || th.name)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-4">{t('setup.memoryMatch.chooseDifficulty')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DIFFICULTY_LEVELS.map(d => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`card-hover text-left p-6 ${difficulty === d.id ? 'ring-2 ring-primary-blue' : ''}`}
            >
              <div className="font-bold text-lg mb-2">{t(DIFF_NAME_KEYS[d.id] || d.name)}</div>
              <div className="text-text-secondary text-sm">{t(DIFF_DESC_KEYS[d.id] || d.description)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button size="lg" onClick={handleStartGame}>
          {t('setup.memoryMatch.startGame')}
        </Button>
      </div>
    </div>
  )
}

export default GameSetupPage
