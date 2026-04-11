import { motion } from 'framer-motion'
import { GAME_THEMES, DIFFICULTY_LEVELS } from '@/config/constants'
import { useTranslation } from 'react-i18next'
import type { GameTheme, DifficultyLevel } from '@/types/game'
import Button from '../common/Button'

const THEME_KEYS: Record<string, string> = {
  ANIMALS: 'setup.memoryMatch.animals', FRUITS: 'setup.memoryMatch.fruits',
  VEHICLES: 'setup.memoryMatch.vehicles', SPACE: 'setup.memoryMatch.space',
  OCEAN: 'setup.memoryMatch.ocean', FORMULA1: 'setup.memoryMatch.formula1',
}
const DIFF_DESC_KEYS: Record<string, string> = {
  EASY: 'setup.memoryMatch.easyDesc', MEDIUM: 'setup.memoryMatch.mediumDesc', HARD: 'setup.memoryMatch.hardDesc',
}
const DIFF_NAME_KEYS: Record<string, string> = { EASY: 'game.easy', MEDIUM: 'game.medium', HARD: 'game.hard' }

interface StartGameModalProps {
  theme: GameTheme
  difficulty: DifficultyLevel
  onStart: () => void
}

const StartGameModal = ({ theme, difficulty, onStart }: StartGameModalProps) => {
  const { t } = useTranslation()
  const themeInfo = GAME_THEMES.find(th => th.id === theme)
  const difficultyInfo = DIFFICULTY_LEVELS.find(d => d.id === difficulty)

  return (
    <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
        initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}>
        <div className="text-7xl mb-4">{themeInfo?.emoji}</div>
        <h2 className="text-3xl font-bold mb-2">{t('setup.memoryMatch.readyToPlay')}</h2>
        <p className="text-text-secondary mb-6">{t('setup.memoryMatch.matchPairs')}</p>

        <div className="space-y-3 mb-6">
          <div className="p-4 bg-bg-light rounded-lg">
            <div className="text-sm text-text-secondary mb-1">{t('setup.memoryMatch.theme')}</div>
            <div className="text-lg font-bold">{t(THEME_KEYS[theme] || themeInfo?.name || '')}</div>
          </div>
          <div className="p-4 bg-bg-light rounded-lg">
            <div className="text-sm text-text-secondary mb-1">{t('setup.memoryMatch.difficulty')}</div>
            <div className="text-lg font-bold">{t(DIFF_NAME_KEYS[difficulty] || difficultyInfo?.name || '')}</div>
            <div className="text-sm text-text-secondary">{t(DIFF_DESC_KEYS[difficulty] || difficultyInfo?.description || '')}</div>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={onStart}>
          {t('setup.memoryMatch.startGame')}
        </Button>
      </motion.div>
    </motion.div>
  )
}

export default StartGameModal
