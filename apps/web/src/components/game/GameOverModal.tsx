import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { formatTime } from '@/utils/formatting'
import { ROUTES } from '@/config/constants'
import type { GameState } from '@/types/game'
import Button from '../common/Button'
import Confetti from './Confetti'

interface GameOverModalProps {
  isOpen: boolean
  gameState: GameState
  onPlayAgain: () => void
  onClose: () => void
}

const GameOverModal = ({ isOpen, gameState, onPlayAgain, onClose }: GameOverModalProps) => {
  const navigate = useNavigate()

  const getPerformanceMessage = () => {
    const totalPairs = gameState.cards.length / 2
    const efficiency = totalPairs / gameState.attempts

    if (efficiency === 1) return '🏆 Perfect! You matched every pair on the first try!'
    if (efficiency >= 0.8) return '🌟 Excellent! Amazing memory skills!'
    if (efficiency >= 0.6) return '✨ Great job! You did really well!'
    if (efficiency >= 0.4) return '👍 Good work! Keep practicing!'
    return '💪 Nice try! You can do even better next time!'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti Effect */}
          <Confetti />

          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
          <motion.div
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Celebration */}
            <motion.div
              className="text-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2">Game Complete!</h2>
              <p className="text-text-secondary">{getPerformanceMessage()}</p>
            </motion.div>

            {/* Stats */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 bg-bg-light rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐</span>
                  <span className="font-medium">Score</span>
                </div>
                <span className="text-2xl font-bold text-primary-blue">{gameState.score}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-light rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⏱️</span>
                  <span className="font-medium">Time</span>
                </div>
                <span className="text-xl font-bold">{formatTime(gameState.elapsedTime)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-light rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <span className="font-medium">Attempts</span>
                </div>
                <span className="text-xl font-bold">{gameState.attempts}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-light rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✨</span>
                  <span className="font-medium">Matches</span>
                </div>
                <span className="text-xl font-bold">{gameState.matches}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={onPlayAgain}>
                🎮 Play Again
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate(ROUTES.GAME_SETUP)}
              >
                🔧 Change Settings
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate(ROUTES.DASHBOARD)}
              >
                📊 View Dashboard
              </Button>
            </div>
          </motion.div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default GameOverModal
