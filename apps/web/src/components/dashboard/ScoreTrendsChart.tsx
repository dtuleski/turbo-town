import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getUserScoreHistory, LeaderboardEntry } from '@/api/leaderboard'
import { ROUTES } from '@/config/constants'

const ScoreTrendsChart = () => {
  const [history, setHistory] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getUserScoreHistory(undefined, 10)
        setHistory(data)
      } catch (err) {
        console.error('Failed to fetch score history:', err)
        setError('Unable to load trends')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const calculateTrend = (): { direction: 'up' | 'down' | 'stable'; percentage: number } => {
    if (history.length < 2) return { direction: 'stable', percentage: 0 }

    const recent = history.slice(0, 3)
    const older = history.slice(3, 6)

    if (older.length === 0) return { direction: 'stable', percentage: 0 }

    const recentAvg = recent.reduce((sum, entry) => sum + entry.score, 0) / recent.length
    const olderAvg = older.reduce((sum, entry) => sum + entry.score, 0) / older.length

    const change = ((recentAvg - olderAvg) / olderAvg) * 100

    if (Math.abs(change) < 5) return { direction: 'stable', percentage: 0 }
    return {
      direction: change > 0 ? 'up' : 'down',
      percentage: Math.abs(change),
    }
  }

  const getMaxScore = () => {
    if (history.length === 0) return 1000
    return Math.max(...history.map((h) => h.score))
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'stable'): string => {
    switch (direction) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      default:
        return '➡️'
    }
  }

  const getTrendMessage = (direction: 'up' | 'down' | 'stable', percentage: number): string => {
    switch (direction) {
      case 'up':
        return `Up ${percentage.toFixed(0)}%!`
      case 'down':
        return `Down ${percentage.toFixed(0)}%`
      default:
        return 'Stable'
    }
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

  if (error || history.length === 0) {
    return (
      <Link to={ROUTES.LEADERBOARD} className="card-hover">
        <div className="text-center py-6">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-bold mb-2">Score Trends</h3>
          <p className="text-text-secondary text-sm mb-3">
            {error || 'Play more games to see your trends!'}
          </p>
          <span className="text-primary text-sm font-medium">
            View History →
          </span>
        </div>
      </Link>
    )
  }

  const trend = calculateTrend()
  const maxScore = getMaxScore()

  return (
    <Link to={ROUTES.LEADERBOARD} className="card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Score Trends</h3>
        <span className="text-2xl">📊</span>
      </div>

      {/* Simple bar chart */}
      <div className="mb-4">
        <div className="flex items-end justify-between gap-1 h-32">
          {history.slice(0, 10).reverse().map((entry, index) => {
            const height = (entry.score / maxScore) * 100
            return (
              <div
                key={`${entry.timestamp}-${index}`}
                className="flex-1 bg-primary/20 rounded-t hover:bg-primary/40 transition-colors relative group"
                style={{ height: `${height}%`, minHeight: '10%' }}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {entry.score.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-2">
          <span>Oldest</span>
          <span>Recent</span>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getTrendIcon(trend.direction)}</span>
            <span className="text-sm font-medium">
              {getTrendMessage(trend.direction, trend.percentage)}
            </span>
          </div>
          <span className="text-primary text-sm font-medium">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ScoreTrendsChart
