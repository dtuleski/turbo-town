import { motion } from 'framer-motion'
import Card from './Card'
import type { GameState } from '@/types/game'
import type { Card as CardType } from '@/types/game'

interface GameBoardProps {
  gameState: GameState
  onCardClick: (card: CardType) => void
}

const GameBoard = ({ gameState, onCardClick }: GameBoardProps) => {
  // Determine grid columns based on number of cards
  const cardCount = gameState.cards.length
  const gridCols =
    cardCount <= 12
      ? 'grid-cols-3 md:grid-cols-4'
      : cardCount <= 16
      ? 'grid-cols-4 md:grid-cols-4'
      : 'grid-cols-4 md:grid-cols-5'

  return (
    <motion.div
      className={`grid ${gridCols} gap-3 md:gap-4 max-w-4xl mx-auto`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {gameState.cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Card card={card} onClick={onCardClick} />
        </motion.div>
      ))}
    </motion.div>
  )
}

export default GameBoard
