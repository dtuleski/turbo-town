import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
}

interface AchievementToastProps {
  achievement: Achievement | null
  onClose: () => void
}

const AchievementToast = ({ achievement, onClose }: AchievementToastProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (achievement) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [achievement, onClose])

  return (
    <AnimatePresence>
      {isVisible && achievement && (
        <motion.div
          className="fixed top-4 right-4 z-50 max-w-sm"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className="bg-gradient-to-r from-primary-purple to-primary-pink text-white rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <motion.div
                className="text-4xl"
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                {achievement.icon}
              </motion.div>
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">🎉 Achievement Unlocked!</div>
                <div className="font-semibold">{achievement.title}</div>
                <div className="text-sm text-white/80">{achievement.description}</div>
              </div>
              <button
                onClick={() => {
                  setIsVisible(false)
                  setTimeout(onClose, 300)
                }}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AchievementToast
