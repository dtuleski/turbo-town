import { useTranslation } from 'react-i18next'
import { formatTime } from '@/utils/formatting'
import type { GameState } from '@/types/game'

interface GameHeaderProps {
  gameState: GameState
  onPause?: () => void
  onResume?: () => void
  onRestart?: () => void
}

const GameHeader = ({ gameState, onPause, onResume, onRestart }: GameHeaderProps) => {
  const { t } = useTranslation()
  const totalPairs = gameState.cards.length / 2

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <div>
              <div className="text-xs text-text-secondary">{t('setup.memoryMatch.time')}</div>
              <div className="text-lg font-bold">{formatTime(gameState.elapsedTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-xs text-text-secondary">{t('setup.memoryMatch.attempts')}</div>
              <div className="text-lg font-bold">{gameState.attempts}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <div>
              <div className="text-xs text-text-secondary">{t('setup.memoryMatch.matches')}</div>
              <div className="text-lg font-bold">{gameState.matches} / {totalPairs}</div>
            </div>
          </div>
          {gameState.status === 'COMPLETED' && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <div className="text-xs text-text-secondary">{t('game.score')}</div>
                <div className="text-lg font-bold">{gameState.score}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gameState.status === 'IN_PROGRESS' && onPause && (
            <button onClick={onPause} className="px-4 py-2 bg-primary-orange text-white rounded-lg hover:bg-opacity-90 transition-all">
              ⏸️ {t('setup.memoryMatch.pause')}
            </button>
          )}
          {gameState.status === 'PAUSED' && onResume && (
            <button onClick={onResume} className="px-4 py-2 bg-primary-green text-white rounded-lg hover:bg-opacity-90 transition-all">
              ▶️ {t('setup.memoryMatch.resume')}
            </button>
          )}
          {onRestart && (
            <button onClick={onRestart} className="px-4 py-2 bg-text-secondary text-white rounded-lg hover:bg-opacity-90 transition-all">
              🔄 {t('setup.memoryMatch.restart')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameHeader
