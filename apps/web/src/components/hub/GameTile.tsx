import { GameCatalogItem, ReviewStats } from '../../api/game'
import { useTranslation } from 'react-i18next'

/** Games that require Premium subscription */
export const PREMIUM_GAMES = new Set(['space-entry'])

interface GameTileProps {
  game: GameCatalogItem
  onClick: () => void
  rating?: ReviewStats
  userTier?: string
}

export default function GameTile({ game, onClick, rating, userTier = 'FREE' }: GameTileProps) {
  const { t } = useTranslation()
  const isActive = game.status === 'ACTIVE'
  const isComingSoon = game.status === 'COMING_SOON'
  const isPremiumGame = PREMIUM_GAMES.has(game.gameId)
  const isLocked = isPremiumGame && userTier !== 'PREMIUM'

  // Use translated title/description/category if available, fallback to server data
  const title = t(`games.${game.gameId}.title`, { defaultValue: game.title })
  const description = t(`games.${game.gameId}.description`, { defaultValue: game.description })
  const category = t(`games.${game.gameId}.category`, { defaultValue: game.category })

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
      {isComingSoon && (
        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
          {t('hub.comingSoon')}
        </div>
      )}

      {isPremiumGame && (
        <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
          👑 Premium
        </div>
      )}

      <div className={`text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-300 ${isLocked ? 'grayscale opacity-60' : ''}`}>
        {game.icon}
      </div>

      <h2 className="text-3xl font-black text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 text-lg mb-4">{description}</p>

      <div className="flex justify-center gap-3 text-sm">
        <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
          {t('hub.ages')} {game.ageRange}
        </span>
        <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full">
          {category}
        </span>
      </div>

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

      {isActive && (
        <div className="mt-6">
          {isLocked ? (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-xl group-hover:from-purple-700 group-hover:to-indigo-700 transition-colors flex items-center justify-center gap-2">
              🔒 {t('hub.upgradeToPremium', { defaultValue: 'Upgrade to Premium' })}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-xl group-hover:from-purple-600 group-hover:to-pink-600 transition-colors">
              {t('hub.playNow')}
            </div>
          )}
        </div>
      )}
    </button>
  )
}
