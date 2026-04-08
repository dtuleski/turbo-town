import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GameType, Timeframe, getUserRank, UserRankResponse } from '@/api/leaderboard'
import { ROUTES } from '@/config/constants'

const LeaderboardRankWidget = () => {
  const [rank, setRank] = useState<UserRankResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRank = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getUserRank(GameType.OVERALL, Timeframe.ALL_TIME)
        setRank(data)
      } catch (err) {
        console.error('Failed to fetch user rank:', err)
        setError('Unable to load rank')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRank()
  }, [])

  const getPercentileMessage = (percentile: number): string => {
    if (percentile >= 90) return 'Top 10%! 🌟'
    if (percentile >= 75) return 'Top 25%! 🎯'
    if (percentile >= 50) return 'Top 50%! 💪'
    return 'Keep playing! 🎮'
  }

  const getRankColor = (percentile: number): string => {
    if (percentile >= 90) return 'text-yellow-500'
    if (percentile >= 75) return 'text-purple-500'
    if (percentile >= 50) return 'text-blue-500'
    return 'text-primary'
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error || !rank) {
    return (
      <Link to={ROUTES.LEADERBOARD} className="card-hover">
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-lg font-bold mb-2">Your Rank</h3>
          <p className="text-text-secondary text-sm mb-3">
            {error || 'Play games to get ranked!'}
          </p>
          <span className="text-primary text-sm font-medium">
            View Leaderboard →
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link to={ROUTES.LEADERBOARD} className="card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Your Rank</h3>
        <span className="text-2xl">🏆</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-4xl font-bold ${getRankColor(rank.percentile)}`}>
            #{rank.rank}
          </div>
          <div className="text-sm text-text-secondary mt-1">
            of {rank.totalPlayers.toLocaleString()} players
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {rank.score.toLocaleString()}
          </div>
          <div className="text-sm text-text-secondary">points</div>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {getPercentileMessage(rank.percentile)}
          </span>
          <span className="text-primary text-sm font-medium">
            View Full Leaderboard →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default LeaderboardRankWidget
