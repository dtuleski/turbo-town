import { motion } from 'framer-motion'
import { GAME_THEMES, DIFFICULTY_LEVELS } from '@/config/constants'
import type { GameTheme, DifficultyLevel } from '@/types/game'
import Button from '../common/Button'

interface StartGameModalProps {
  theme: GameTheme
  difficulty: DifficultyLevel
  onStart: () => void
}

const StartGameModal = ({ theme, difficulty, onStart }: StartGameModalProps) => {
  const themeInfo = GAME_THEMES.find(t => t.id === theme)
  const difficultyInfo = DIFFICULTY_LEVELS.find(d => d.id === difficulty)

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
      >
        <div className="text-7xl mb-4">{themeInfo?.emoji}</div>
        <h2 className="text-3xl font-bold mb-2">Ready to Play?</h2>
        <p className="text-text-secondary mb-6">Match all the pairs as fast as you can!</p>

        <div className="space-y-3 mb-6">
          <div className="p-4 bg-bg-light rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Theme</div>
            <div className="text-lg font-bold">{themeInfo?.name}</div>
          </div>

          <div className="p-4 bg-bg-light rounded-lg">
            <div className="text-sm text-text-secondary mb-1">Difficulty</div>
            <div className="text-lg font-bold">{difficultyInfo?.name}</div>
            <div className="text-sm text-text-secondary">{difficultyInfo?.description}</div>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={onStart}>
          🚀 Start Game
        </Button>
      </motion.div>
    </motion.div>
  )
}

export default StartGameModal
