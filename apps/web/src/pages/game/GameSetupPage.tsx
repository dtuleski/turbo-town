import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES, GAME_THEMES, DIFFICULTY_LEVELS } from '@/config/constants'
import { canStartGame } from '@/api/game'
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
  SUPER_HARD: 'setup.memoryMatch.superHardDesc',
}

const DIFF_NAME_KEYS: Record<string, string> = {
  EASY: 'game.easy',
  MEDIUM: 'game.medium',
  HARD: 'game.hard',
  SUPER_HARD: 'game.superHard',
}

const GameSetupPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<GameTheme | ''>('')
  const [difficulty, setDifficulty] = useState<DifficultyLevel | ''>('')
  const [isPremium, setIsPremium] = useState(false)

  // Check premium status for Super Hard access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await canStartGame()
        const tier = result?.rateLimit?.tier
        setIsPremium(!!tier && tier !== 'FREE')
      } catch {
        setIsPremium(false)
      }
    }
    checkAccess()
  }, [])

  // Filter themes based on selected difficulty
  const availableThemes = GAME_THEMES.filter(th => {
    if (!difficulty) return true
    const level = DIFFICULTY_LEVELS.find(d => d.id === difficulty)
    if (!level) return true
    return th.maxPairs >= level.pairs
  })

  // Reset theme if it becomes unavailable after difficulty change
  useEffect(() => {
    if (theme && !availableThemes.find(t => t.id === theme)) {
      setTheme('')
    }
  }, [difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartGame = () => {
    if (!theme || !difficulty) return

    // Premium gate for Super Hard
    if (difficulty === 'SUPER_HARD' && !isPremium) {
      navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true } })
      return
    }

    navigate(ROUTES.GAME, { state: { theme, difficulty } })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8">{t('setup.memoryMatch.letsPlay')}</h1>

      {/* Step 1: Choose Difficulty */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-4">{t('setup.memoryMatch.chooseDifficulty')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIFFICULTY_LEVELS.map(d => {
            const isLocked = d.id === 'SUPER_HARD' && !isPremium
            return (
              <button
                key={d.id}
                onClick={() => {
                  if (isLocked) {
                    navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true } })
                    return
                  }
                  setDifficulty(d.id as DifficultyLevel)
                }}
                className={`card-hover text-left p-6 relative ${
                  difficulty === d.id ? 'ring-2 ring-primary-blue' : ''
                } ${isLocked ? 'opacity-70' : ''}`}
              >
                {d.id === 'SUPER_HARD' && (
                  <span className="absolute top-2 right-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                    {isPremium ? '⭐ Paid' : '🔒 Paid'}
                  </span>
                )}
                <div className="font-bold text-lg mb-2">
                  {t(DIFF_NAME_KEYS[d.id] || d.name)}
                </div>
                <div className="text-text-secondary text-sm">
                  {t(DIFF_DESC_KEYS[d.id] || d.description)}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: Choose Theme (filtered by difficulty) */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold mb-4">
          {t('setup.memoryMatch.chooseTheme')}
          {difficulty === 'SUPER_HARD' && (
            <span className="text-sm text-text-secondary font-normal ml-2">
              (Themes with 15+ images)
            </span>
          )}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {availableThemes.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id as GameTheme)}
              className={`card-hover text-center p-6 ${theme === th.id ? 'ring-2 ring-primary-blue' : ''}`}
            >
              <div className="text-4xl mb-2">{th.emoji}</div>
              <div className="font-medium">{t(THEME_KEYS[th.id] || th.name)}</div>
            </button>
          ))}
        </div>
        {difficulty === 'SUPER_HARD' && availableThemes.length < GAME_THEMES.length && (
          <p className="text-text-secondary text-sm mt-3 text-center">
            Some themes don't have enough images for 15 pairs
          </p>
        )}
      </div>

      {/* Start Button */}
      <div className="text-center">
        <Button size="lg" onClick={handleStartGame} disabled={!theme || !difficulty}>
          {t('setup.memoryMatch.startGame')}
        </Button>
      </div>
    </div>
  )
}

export default GameSetupPage
