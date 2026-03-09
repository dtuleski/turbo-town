import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAvailableGames, GameCatalogItem } from '../../api/game'
import GameTile from '../../components/hub/GameTile'
import { useAuth } from '../../context/AuthContext'

export default function GameHubPage() {
  const [games, setGames] = useState<GameCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      setLoading(true)
      const data = await listAvailableGames()
      setGames(data)
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
        <div className="text-center mb-12">
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

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dynamic Games from Backend */}
          {games.map((game) => (
            <GameTile
              key={game.gameId}
              game={game}
              onClick={() => handleGameClick(game)}
            />
          ))}
        </div>

        {/* Empty State */}
        {games.length === 0 && (
          <div className="text-center text-white text-xl font-bold mt-12">
            No games available right now. Check back soon!
          </div>
        )}
      </div>
    </div>
  )
}
