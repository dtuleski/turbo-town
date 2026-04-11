import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { ROUTES } from '@/config/constants'
import { submitGameReview } from '@/api/game'

interface ScoreBreakdown {
  baseScore: number
  difficultyMultiplier: number
  speedBonus: number
  accuracyBonus: number
  finalScore: number
  difficulty: string
  completionTime: number
  accuracy: number
}

interface ScoreBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  scoreBreakdown: ScoreBreakdown | null
  leaderboardRank?: number | null
  onPlayAgain?: () => void
  gameType?: string
}

const ScoreBreakdownModal = ({
  isOpen,
  onClose,
  scoreBreakdown,
  leaderboardRank,
  onPlayAgain,
  gameType,
}: ScoreBreakdownModalProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedRating, setSelectedRating] = useState(0)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  if (!scoreBreakdown) return null

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const formatMultiplier = (value: number): string => {
    return `${value.toFixed(2)}x`
  }

  const getRankBadge = (rank: number): { color: string; icon: string; text: string } => {
    if (rank === 1) return { color: 'bg-yellow-500', icon: '🥇', text: '1st Place!' }
    if (rank === 2) return { color: 'bg-gray-400', icon: '🥈', text: '2nd Place!' }
    if (rank === 3) return { color: 'bg-orange-600', icon: '🥉', text: '3rd Place!' }
    if (rank <= 10) return { color: 'bg-purple-500', icon: '🌟', text: `Top 10!` }
    if (rank <= 50) return { color: 'bg-blue-500', icon: '⭐', text: `Top 50!` }
    return { color: 'bg-primary', icon: '🎯', text: `Rank #${rank}` }
  }

  const rankBadge = leaderboardRank ? getRankBadge(leaderboardRank) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🎉 ${t('game.gameComplete')}`} size="lg">
      <div className="space-y-3">
        {/* Final Score + Rank */}
        <div className="text-center py-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
          <div className="text-3xl font-bold text-primary">
            {Math.round(scoreBreakdown.finalScore).toLocaleString()}
          </div>
          <div className="text-xs text-text-secondary">{t('game.totalScore')}</div>
          {rankBadge && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-bold" style={{ backgroundColor: rankBadge.color === 'bg-yellow-500' ? '#eab308' : rankBadge.color === 'bg-gray-400' ? '#9ca3af' : rankBadge.color === 'bg-orange-600' ? '#ea580c' : rankBadge.color === 'bg-purple-500' ? '#a855f7' : rankBadge.color === 'bg-blue-500' ? '#3b82f6' : '#6366f1' }}>
              {rankBadge.icon} {rankBadge.text}
            </div>
          )}
        </div>

        {/* Score Breakdown — compact rows */}
        <div className="space-y-1">
          {[
            { icon: '📊', label: t('game.baseScore'), value: Math.round(scoreBreakdown.baseScore).toLocaleString(), sub: '' },
            { icon: '⚡', label: t('game.difficulty'), value: formatMultiplier(scoreBreakdown.difficultyMultiplier), sub: scoreBreakdown.difficulty },
            { icon: '⏱️', label: t('game.speed'), value: formatMultiplier(scoreBreakdown.speedBonus), sub: formatTime(scoreBreakdown.completionTime) },
            { icon: '🎯', label: t('game.accuracy'), value: formatMultiplier(scoreBreakdown.accuracyBonus), sub: `${(scoreBreakdown.accuracy * 100).toFixed(0)}%` },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-3 py-2 bg-card rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span>{row.icon}</span>
                <span className="font-medium">{row.label}</span>
                {row.sub && <span className="text-xs text-text-secondary">({row.sub})</span>}
              </div>
              <span className="font-bold text-primary">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Star Rating */}
        {gameType && (
          <div className="text-center py-2">
            {reviewSubmitted ? (
              <div className="text-sm text-green-400 font-medium">{t('game.thanksFeedback')}</div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-text-secondary">{t('game.rateGame')}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={async () => {
                        setSelectedRating(star)
                        setReviewSubmitted(true)
                        try { await submitGameReview(gameType, star) } catch {}
                      }}
                      className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                      aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    >
                      {star <= (hoveredStar || selectedRating) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => { navigate(ROUTES.LEADERBOARD); onClose() }}
          >
            {t('game.leaderboardBtn')}
          </Button>
          {onPlayAgain && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { onPlayAgain(); onClose() }}
            >
              {t('game.playAgainBtn')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t('game.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ScoreBreakdownModal