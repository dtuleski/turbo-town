import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { getUserStatistics } from '@/api/game'

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
        console.log('Fetching user statistics...')
        const data = await getUserStatistics()
        console.log('Statistics received:', data)
        setStats({
          totalGames: data.totalGames,
          bestScore: data.bestScore,
          totalCompletedGames: data.totalCompletedGames,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="text-4xl mb-4">🏆</div>
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
