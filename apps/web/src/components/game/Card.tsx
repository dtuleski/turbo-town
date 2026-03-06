import { motion } from 'framer-motion'
import type { Card as CardType } from '@/types/game'

interface CardProps {
  card: CardType
  onClick: (card: CardType) => void
}

const Card = ({ card, onClick }: CardProps) => {
  const handleClick = () => {
    if (!card.isFlipped && !card.isMatched) {
      onClick(card)
    }
  }

  // Check if this is an F1 driver card (starts with emoji)
  const isF1Driver = card.value.match(/^[🔴🟢🔵⚫🟠🟡⚪🟤🟣🔷]/)

  return (
    <motion.div
      className="relative aspect-square cursor-pointer"
      onClick={handleClick}
      whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
      whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-blue to-primary-purple flex items-center justify-center shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          <div className="text-4xl">❓</div>
        </div>

        {/* Card Front */}
        <div
          className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center shadow-lg p-2 ${
            card.isMatched
              ? 'bg-gradient-to-br from-status-success to-primary-green'
              : 'bg-white'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <motion.div
            className={`${card.value.length > 3 ? 'text-sm md:text-base font-semibold text-center' : 'text-5xl md:text-6xl'}`}
            animate={card.isMatched ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            {card.value}
          </motion.div>
          {card.isMatched && isF1Driver && (
            <motion.div
              className="text-xs font-bold text-white mt-1 bg-black bg-opacity-30 px-2 py-0.5 rounded"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Teammates!
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Card
