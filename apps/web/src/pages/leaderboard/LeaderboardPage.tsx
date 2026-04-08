import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'
import { GameType, Timeframe, getLeaderboard, LeaderboardResponse, clearAllRecords } from '@/api/leaderboard'
import TimeframeSelector from '@/components/leaderboard/TimeframeSelector'
import GameTypeFilter from '@/components/leaderboard/GameTypeFilter'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import Button from '@/components/common/Button'

const ADMIN_EMAIL = 'diegotuleski@gmail.com'

const LeaderboardPage = () => {
  const [gameType, setGameType] = useState<GameType>(GameType.OVERALL)
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.WEEKLY)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const session = await fetchAuthSession()
        const email = session.tokens?.idToken?.payload?.email as string
        setIsAdmin(email === ADMIN_EMAIL)
      } catch (err) {
        console.error('Failed to check admin status:', err)
      }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log('Fetching leaderboard:', { gameType, timeframe })
        const data = await getLeaderboard(gameType, timeframe, 100)
        console.log('Leaderboard data:', data)
        setLeaderboard(data)
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
        setError('Failed to load leaderboard. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [gameType, timeframe])

  const handleClearAllRecords = async () => {
    if (!isAdmin) return
    
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL leaderboard records. This action cannot be undone. Continue?'
    )
    
    if (!confirmed) return

    try {
      setIsClearing(true)
      const result = await clearAllRecords()
      
      if (result.success) {
        alert('✅ ' + result.message)
        // Refresh leaderboard
        const data = await getLeaderboard(gameType, timeframe, 100)
        setLeaderboard(data)
      } else {
        alert('❌ Failed to clear records: ' + result.message)
      }
    } catch (err) {
      console.error('Failed to clear records:', err)
      alert('❌ Failed to clear records. Please try again or check the console for details.')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🏆 Leaderboard</h1>
        <p className="text-text-secondary">
          Compete with players worldwide and climb the ranks!
        </p>
      </div>

      <div className="mb-6">
        <GameTypeFilter selected={gameType} onChange={setGameType} />
      </div>

      <TimeframeSelector selected={timeframe} onChange={setTimeframe} />

      {error && (
        <div className="card bg-red-500/10 border border-red-500/20 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-red-500">Error</h3>
              <p className="text-text-secondary">{error}</p>
            </div>
          </div>
        </div>
      )}

      {leaderboard && leaderboard.currentUserEntry && !isLoading && (
        <div className="card mb-6 bg-primary/5 border-2 border-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold mb-1">Your Rank</h3>
              <p className="text-text-secondary">
                You're ranked #{leaderboard.currentUserEntry.rank} out of {leaderboard.totalEntries} players
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  #{leaderboard.currentUserEntry.rank}
                </div>
                <div className="text-sm text-text-secondary">Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {leaderboard.currentUserEntry.score.toLocaleString()}
                </div>
                <div className="text-sm text-text-secondary">Score</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {timeframe === Timeframe.DAILY && 'Today\'s Top Players'}
          {timeframe === Timeframe.WEEKLY && 'This Week\'s Top Players'}
          {timeframe === Timeframe.MONTHLY && 'This Month\'s Top Players'}
          {timeframe === Timeframe.ALL_TIME && 'All-Time Top Players'}
        </h2>
        <div className="flex items-center gap-4">
          {leaderboard && !isLoading && (
            <span className="text-text-secondary">
              {leaderboard.totalEntries} {leaderboard.totalEntries === 1 ? 'player' : 'players'}
            </span>
          )}
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearAllRecords}
              disabled={isClearing}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
            >
              {isClearing ? '⏳ Clearing...' : '🗑️ Clear All Records'}
            </Button>
          )}
        </div>
      </div>

      <LeaderboardTable
        entries={leaderboard?.entries || []}
        isLoading={isLoading}
      />

      {leaderboard && leaderboard.entries.length > 0 && !isLoading && (
        <div className="mt-6 text-center text-text-secondary text-sm">
          <p>Showing top {leaderboard.entries.length} players</p>
          <p className="mt-2">
            Keep playing to improve your rank! 🎮
          </p>
        </div>
      )}
    </div>
  )
}

export default LeaderboardPage
