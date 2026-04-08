import { GameCatalogItem, ReviewStats } from '../../api/game'

interface GameTileProps {
  game: GameCatalogItem
  onClick: () => void
  rating?: ReviewStats
}

export default function GameTile({ game, onClick, rating }: GameTileProps) {
  const isActive = game.status === 'ACTIVE'
  const isComingSoon = game.status === 'COMING_SOON'

  return (
    <button
      onClick={onClick}
      disabled={!isActive}
      className={`
        relative group
        bg-white rounded-3xl p-8
        shadow-xl hover:shadow-2xl
        transform transition-all duration-300
        ${isActive ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-75'}
      `}
    >
      {/* Coming Soon Badge */}
      {isComingSoon && (
        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
          Coming Soon!
        </div>
      )}

      {/* Game Icon */}
      <div className="text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
        {game.icon}
      </div>

      {/* Game Title */}
      <h2 className="text-3xl font-black text-gray-800 mb-2">
        {game.title}
      </h2>

      {/* Game Description */}
      <p className="text-gray-600 text-lg mb-4">
        {game.description}
      </p>

      {/* Age Range & Category */}
      <div className="flex justify-center gap-3 text-sm">
        <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
          Ages {game.ageRange}
        </span>
        <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full">
          {game.category}
        </span>
      </div>

      {/* Rating */}
      {rating && rating.totalReviews > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-3 text-sm">
          <div className="flex">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s} className={`text-base ${s <= Math.round(rating.averageRating) ? 'opacity-100' : 'opacity-25'}`}>⭐</span>
            ))}
          </div>
          <span className="font-bold text-gray-700">{rating.averageRating.toFixed(1)}</span>
          <span className="text-gray-400">({rating.totalReviews})</span>
        </div>
      )}

      {/* Play Button (Active games only) */}
      {isActive && (
        <div className="mt-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl group-hover:from-purple-600 group-hover:to-pink-600 transition-colors">
            Play Now! →
          </div>
        </div>
      )}
    </button>
  )
}
