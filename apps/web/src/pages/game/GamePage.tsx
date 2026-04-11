import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { useGame } from '@/hooks/useGame'
import GameBoard from '@/components/game/GameBoard'
import GameHeader from '@/components/game/GameHeader'
import StartGameModal from '@/components/game/StartGameModal'
import GameOverModal from '@/components/game/GameOverModal'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import AchievementToast from '@/components/game/AchievementToast'
import type { GameTheme, DifficultyLevel } from '@/types/game'

const GamePage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme, difficulty } = (location.state as {
    theme: GameTheme
    difficulty: DifficultyLevel
  }) || {}

  const [achievement, setAchievement] = useState<{
    id: string
    title: string
    description: string
    icon: string
  } | null>(null)

  // Redirect if no game settings
  useEffect(() => {
    if (!theme || !difficulty) {
      navigate(ROUTES.GAME_SETUP)
    }
  }, [theme, difficulty, navigate])

  const { gameState, startGame, pauseGame, resumeGame, restartGame, handleCardClick, scoreBreakdown, leaderboardRank } = useGame(
    theme,
    difficulty
  )

  // Check for achievements when game completes
  useEffect(() => {
    if (gameState.status === 'COMPLETED') {
      // Check for perfect game
      const totalPairs = gameState.cards.length / 2
      if (gameState.attempts === totalPairs) {
        setAchievement({
          id: 'perfect-game',
          title: 'Perfect Game!',
          description: 'You matched every pair on the first try!',
          icon: '🏆',
        })
      }
      // Check for speed demon (under 30 seconds for easy)
      else if (difficulty === 'EASY' && gameState.elapsedTime < 30) {
        setAchievement({
          id: 'speed-demon',
          title: 'Speed Demon!',
          description: 'Completed in under 30 seconds!',
          icon: '⚡',
        })
      }
      // Check for first win
      else if (gameState.matches === totalPairs) {
        setAchievement({
          id: 'first-win',
          title: 'First Win!',
          description: 'You completed your first game!',
          icon: '🎉',
        })
      }
    }
  }, [gameState.status, gameState.attempts, gameState.elapsedTime, gameState.matches, difficulty])

  if (!theme || !difficulty) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with stats and controls */}
      <GameHeader
        gameState={gameState}
        onPause={pauseGame}
        onResume={resumeGame}
        onRestart={restartGame}
      />

      {/* Game Board */}
      {gameState.status !== 'NOT_STARTED' && (
        <GameBoard gameState={gameState} onCardClick={handleCardClick} />
      )}

      {/* Pause overlay */}
      {gameState.status === 'PAUSED' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⏸️</div>
            <h2 className="text-3xl font-bold mb-4">{t('setup.memoryMatch.gamePaused')}</h2>
            <button
              onClick={resumeGame}
              className="px-6 py-3 bg-primary-blue text-white rounded-lg text-lg font-medium hover:bg-opacity-90 transition-all"
            >
              ▶️ {t('setup.memoryMatch.resume')}
            </button>
          </div>
        </div>
      )}

      {/* Start Game Modal */}
      {gameState.status === 'NOT_STARTED' && (
        <StartGameModal theme={theme} difficulty={difficulty} onStart={startGame} />
      )}

      {/* Game Over Modal - Show if no score breakdown */}
      {gameState.status === 'COMPLETED' && !scoreBreakdown && (
        <GameOverModal
          isOpen={true}
          gameState={gameState}
          onPlayAgain={restartGame}
          onClose={() => navigate(ROUTES.GAME_SETUP)}
        />
      )}

      {/* Score Breakdown Modal - Show if score breakdown available */}
      <ScoreBreakdownModal
        isOpen={gameState.status === 'COMPLETED' && !!scoreBreakdown}
        onClose={() => navigate(ROUTES.GAME_SETUP)}
        scoreBreakdown={scoreBreakdown}
        leaderboardRank={leaderboardRank}
        onPlayAgain={restartGame}
        gameType="MEMORY_MATCH"
      />

      {/* Achievement Toast */}
      <AchievementToast achievement={achievement} onClose={() => setAchievement(null)} />
    </div>
  )
}

export default GamePage
