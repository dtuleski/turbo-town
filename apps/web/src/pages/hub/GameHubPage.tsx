import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAvailableGames, GameCatalogItem, getReviewStats, ReviewStats } from '../../api/game'
import GameTile from '../../components/hub/GameTile'
import { useAuth } from '../../context/AuthContext'

// Subject-based category filter mapping (gameId -> filter group)
const GAME_FILTER_MAP: Record<string, string> = {
  'math-challenge': 'Science & Math',
  'sudoku': 'Science & Math',
  'history-quiz': 'History & Civics',
  'civics-quiz': 'History & Civics',
  'geo-quiz': 'Geography & Language',
  'language-learning': 'Geography & Language',
  'memory-match': 'Puzzles & Logic',
  'word-puzzle': 'Puzzles & Logic',
  'jigsaw-puzzle': 'Puzzles & Logic',
  'code-a-bot': 'Puzzles & Logic',
  'bubble-pop': 'Puzzles & Logic',
  'sequence-memory': 'Puzzles & Logic',
  'color-by-number': 'Puzzles & Logic',
  'hangman': 'Puzzles & Logic',
  'tic-tac-toe': 'Puzzles & Logic',
}

const FILTER_CHIPS = [
  { id: 'all', label: 'All', emoji: '🎮' },
  { id: 'Science & Math', label: 'Science & Math', emoji: '🔬' },
  { id: 'History & Civics', label: 'History & Civics', emoji: '📚' },
  { id: 'Geography & Language', label: 'Geography & Language', emoji: '🌍' },
  { id: 'Puzzles & Logic', label: 'Puzzles & Logic', emoji: '🧩' },
]

export default function GameHubPage() {
  const [games, setGames] = useState<GameCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Map<string, ReviewStats>>(new Map())
  const [activeFilter, setActiveFilter] = useState('all')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      setLoading(true)
      const [data, reviewData] = await Promise.allSettled([
        listAvailableGames(),
        getReviewStats(),
      ])
      if (data.status === 'fulfilled') setGames(data.value)
      if (reviewData.status === 'fulfilled') {
        const map = new Map<string, ReviewStats>()
        reviewData.value.perGame.forEach(r => map.set(r.gameType, r))
        setRatings(map)
      }
    } catch (err) {
      console.error('Failed to load games:', err)
      setError('Failed to load games. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGameClick = (game: GameCatalogItem) => {
    if (game.status === 'ACTIVE') {
      navigate(game.route)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Loading games...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md">
          <p className="text-red-500 text-xl font-bold mb-4">Oops!</p>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={loadGames}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">
            🎮 DashDen Game Hub
          </h1>
          <p className="text-2xl text-white font-bold drop-shadow mb-2">
            Hi {user?.username || 'Player'}! Pick a game to play!
          </p>
          <p className="text-lg text-white/90 drop-shadow">
            Educational games that make learning fun
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span className="text-2xl">📊</span>
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span className="text-2xl">🏆</span>
            <span>Leaderboard</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all duration-200 flex items-center gap-1.5 ${
                activeFilter === chip.id
                  ? 'bg-white text-purple-700 shadow-lg scale-105'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games
            .filter((game) => activeFilter === 'all' || GAME_FILTER_MAP[game.gameId] === activeFilter)
            .map((game) => (
            <GameTile
              key={game.gameId}
              game={game}
              onClick={() => handleGameClick(game)}
              rating={ratings.get(game.gameId.toUpperCase().replace(/-/g, '_'))}
            />
          ))}
        </div>

        {/* Empty State */}
        {games.length === 0 && (
          <div className="text-center text-white text-xl font-bold mt-12">
            No games available right now. Check back soon!
          </div>
        )}
        {games.length > 0 && games.filter((g) => activeFilter === 'all' || GAME_FILTER_MAP[g.gameId] === activeFilter).length === 0 && (
          <div className="text-center text-white/80 text-lg font-bold mt-8">
            No games in this category yet. Try another filter!
          </div>
        )}
      </div>
    </div>
  )
}
