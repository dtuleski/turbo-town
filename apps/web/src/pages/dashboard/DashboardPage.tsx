import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { getUserStatistics } from '@/api/game'
import { getUserScoreHistory } from '@/api/leaderboard'
import LeaderboardRankWidget from '@/components/dashboard/LeaderboardRankWidget'
import ScoreTrendsChart from '@/components/dashboard/ScoreTrendsChart'
import RecentImprovements from '@/components/dashboard/RecentImprovements'

const DashboardPage = () => {
  const location = useLocation()
  const [stats, setStats] = useState({
    totalGames: 0,
    bestScore: 0,
    totalCompletedGames: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const [statsResult, historyResult] = await Promise.allSettled([
          getUserStatistics(),
          getUserScoreHistory(undefined, 100),
        ])
        const data = statsResult.status === 'fulfilled' ? statsResult.value : null
        const history = historyResult.status === 'fulfilled' ? historyResult.value : []
        const leaderboardBest = history.length > 0 ? Math.max(...history.map(h => h.score)) : 0
        setStats({
          totalGames: data?.totalGames || history.length,
          bestScore: leaderboardBest || data?.bestScore || 0,
          totalCompletedGames: data?.totalCompletedGames || history.length,
        })
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [location.pathname]) // Refetch when navigating to dashboard

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="text-4xl mb-2">🎮</div>
          <div className="text-3xl font-bold mb-1">
            {isLoading ? '...' : stats.totalGames}
          </div>
          <div className="text-text-secondary">Total Games</div>
        </div>

        <div className="card">
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-3xl font-bold mb-1">
            {isLoading ? '...' : stats.bestScore}
          </div>
          <div className="text-text-secondary">Best Score</div>
        </div>

        <div className="card">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-3xl font-bold mb-1">
            {isLoading ? '...' : stats.totalCompletedGames}
          </div>
          <div className="text-text-secondary">Completed Games</div>
        </div>
      </div>

      {/* Leaderboard Widgets */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LeaderboardRankWidget />
          <ScoreTrendsChart />
          <RecentImprovements />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to={ROUTES.LEADERBOARD} className="card-hover">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-xl font-bold mb-2">Leaderboard</h2>
          <p className="text-text-secondary">Compete with players worldwide</p>
        </Link>

        <Link to={ROUTES.STATISTICS} className="card-hover">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">Statistics</h2>
          <p className="text-text-secondary">View your detailed game statistics</p>
        </Link>

        <Link to={ROUTES.HISTORY} className="card-hover">
          <div className="text-4xl mb-4">📜</div>
          <h2 className="text-xl font-bold mb-2">Game History</h2>
          <p className="text-text-secondary">See all your past games</p>
        </Link>

        <Link to={ROUTES.ACHIEVEMENTS} className="card-hover">
          <div className="text-4xl mb-4">🏅</div>
          <h2 className="text-xl font-bold mb-2">Achievements</h2>
          <p className="text-text-secondary">Track your progress and unlock badges</p>
        </Link>

        <Link to={ROUTES.PROFILE} className="card-hover">
          <div className="text-4xl mb-4">👤</div>
          <h2 className="text-xl font-bold mb-2">Profile</h2>
          <p className="text-text-secondary">Manage your account settings</p>
        </Link>
      </div>
    </div>
  )
}

export default DashboardPage
