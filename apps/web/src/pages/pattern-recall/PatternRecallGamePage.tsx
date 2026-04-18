import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  THEMES,
  DIFFICULTIES,
  getGridItems,
  generateInitialSequence,
  extendSequence,
  validateTap,
  getPlaybackSpeed,
  getDifficultyValue,
  type PatternRecallTheme,
  type PatternRecallDifficulty,
  type ThemeItem,
} from '@/utils/patternRecallUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type GamePhase = 'loading' | 'playback' | 'input' | 'correct' | 'game-over' | 'submitting' | 'completed'

export default function PatternRecallGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  const themeParam = searchParams.get('theme') as PatternRecallTheme | null
  const difficultyParam = searchParams.get('difficulty') as PatternRecallDifficulty | null

  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [items, setItems] = useState<ThemeItem[]>([])
  const [sequence, setSequence] = useState<number[]>([])
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState(-1)
  const [currentInputIndex, setCurrentInputIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [timer, setTimer] = useState(0)
  const [totalTaps, setTotalTaps] = useState(0)
  const [feedbackItem, setFeedbackItem] = useState<number | null>(null)
  const [feedbackType, setFeedbackType] = useState<'correct' | 'wrong' | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playbackTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const phaseRef = useRef<GamePhase>('loading')

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Validate URL params
  useEffect(() => {
    if (!themeParam || !difficultyParam || !THEMES[themeParam] || !DIFFICULTIES[difficultyParam]) {
      navigate(ROUTES.PATTERN_RECALL_SETUP, { replace: true })
    }
  }, [themeParam, difficultyParam, navigate])

  // Initialize game
  useEffect(() => {
    if (!themeParam || !difficultyParam || !THEMES[themeParam] || !DIFFICULTIES[difficultyParam]) return

    const initGame = async () => {
      try {
        const game = await startGame({
          themeId: 'PATTERN_RECALL',
          difficulty: getDifficultyValue(difficultyParam),
        })
        setGameId(game.id)

        const gridItems = getGridItems(themeParam, difficultyParam)
        setItems(gridItems)

        const initialSeq = generateInitialSequence(gridItems.length)
        setSequence(initialSeq)
        setRoundNumber(1)
        setPhase('playback')
      } catch (error: any) {
        console.error('Failed to start game:', error)
        if (
          error?.message?.includes('Rate limit') ||
          error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED'
        ) {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else {
          navigate(ROUTES.HUB)
        }
      }
    }

    initGame()
  }, [themeParam, difficultyParam, navigate])

  // Timer
  useEffect(() => {
    if (phase === 'playback' || phase === 'input' || phase === 'correct') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setTimer((prev) => prev + 1)
        }, 1000)
      }
    }

    if (phase === 'game-over' || phase === 'submitting' || phase === 'completed' || phase === 'loading') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [phase])

  // Playback animation
  useEffect(() => {
    if (phase !== 'playback' || !difficultyParam || sequence.length === 0) return

    const speed = getPlaybackSpeed(difficultyParam)

    // Clear any existing timeouts
    playbackTimeoutsRef.current.forEach(clearTimeout)
    playbackTimeoutsRef.current = []

    // Animate each item in sequence
    sequence.forEach((_, idx) => {
      // Show highlight
      const showTimeout = setTimeout(() => {
        if (phaseRef.current !== 'playback') return
        setCurrentPlaybackIndex(idx)
      }, idx * speed)

      // Hide highlight (halfway through the interval)
      const hideTimeout = setTimeout(() => {
        if (phaseRef.current !== 'playback') return
        setCurrentPlaybackIndex(-1)
      }, idx * speed + speed * 0.7)

      playbackTimeoutsRef.current.push(showTimeout, hideTimeout)
    })

    // Transition to input after all items played
    const endTimeout = setTimeout(() => {
      if (phaseRef.current !== 'playback') return
      setCurrentPlaybackIndex(-1)
      setCurrentInputIndex(0)
      setPhase('input')
    }, sequence.length * speed + 300)

    playbackTimeoutsRef.current.push(endTimeout)

    return () => {
      playbackTimeoutsRef.current.forEach(clearTimeout)
      playbackTimeoutsRef.current = []
    }
  }, [phase, sequence, difficultyParam])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playbackTimeoutsRef.current.forEach(clearTimeout)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleTap = useCallback(
    (index: number) => {
      if (phase !== 'input') return

      setTotalTaps((prev) => prev + 1)

      const isCorrect = validateTap(sequence, currentInputIndex, index)

      if (isCorrect) {
        // Show green flash
        setFeedbackItem(index)
        setFeedbackType('correct')
        setTimeout(() => {
          setFeedbackItem(null)
          setFeedbackType(null)
        }, 200)

        const nextInputIndex = currentInputIndex + 1

        if (nextInputIndex >= sequence.length) {
          // Completed the sequence — advance to next round
          setPhase('correct')
          setTimeout(() => {
            const newSequence = extendSequence(sequence, items.length)
            setSequence(newSequence)
            setRoundNumber((prev) => prev + 1)
            setCurrentInputIndex(0)
            setPhase('playback')
          }, 800)
        } else {
          setCurrentInputIndex(nextInputIndex)
        }
      } else {
        // Wrong tap — game over
        setFeedbackItem(index)
        setFeedbackType('wrong')
        setTimeout(() => {
          setFeedbackItem(null)
          setFeedbackType(null)
          setPhase('game-over')
        }, 400)
      }
    },
    [phase, sequence, currentInputIndex, items.length]
  )

  const handleSeeScore = useCallback(async () => {
    if (phase !== 'game-over') return
    setPhase('submitting')

    try {
      const roundsCompleted = roundNumber - 1
      const result = await completeGame({
        gameId,
        completionTime: timer,
        attempts: totalTaps,
        correctAnswers: roundsCompleted,
        totalQuestions: roundNumber,
      })

      if (result.scoreBreakdown) {
        setScoreBreakdown(result.scoreBreakdown)
      }
      if (result.leaderboardRank) {
        setLeaderboardRank(result.leaderboardRank)
      }
    } catch (error) {
      console.error('Failed to complete game:', error)
    } finally {
      setPhase('completed')
    }
  }, [phase, gameId, timer, totalTaps, roundNumber])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
        <div className="text-4xl text-white font-bold animate-pulse">{t('common.loading')}</div>
      </div>
    )
  }

  // Submitting state
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="text-2xl text-gray-700 font-bold">{t('game.calculating')}</div>
        </div>
      </div>
    )
  }

  // Completed state — show ScoreBreakdownModal
  if (phase === 'completed') {
    if (scoreBreakdown) {
      return (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.PATTERN_RECALL_SETUP)}
          scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => navigate(ROUTES.PATTERN_RECALL_SETUP)}
          gameType="PATTERN_RECALL"
        />
      )
    }

    // Fallback completion screen
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 py-8 px-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🧩</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('game.gameComplete')}</h1>
          <p className="text-xl text-gray-600 mb-2">
            {t('patternRecall.game.roundsCompleted', { count: roundNumber - 1 })}
          </p>
          <p className="text-lg text-gray-500 mb-6">
            {t('patternRecall.game.totalTime', { time: formatTime(timer) })}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(ROUTES.PATTERN_RECALL_SETUP)}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              {t('game.playAgain')}
            </button>
            <button
              onClick={() => navigate(ROUTES.HUB)}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              {t('game.close')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main game UI (playback, input, correct, game-over)
  const phaseLabel =
    phase === 'playback'
      ? t('patternRecall.game.watchPattern')
      : phase === 'input'
        ? t('patternRecall.game.yourTurn')
        : phase === 'correct'
          ? t('patternRecall.game.correct')
          : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* HUD */}
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">{t('game.round')}</div>
            <div className="text-2xl font-bold text-gray-800">
              {t('patternRecall.game.round', { current: roundNumber })}
            </div>
          </div>

          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">{t('patternRecall.game.time')}</div>
            <div className="text-2xl font-bold text-gray-800">{formatTime(timer)}</div>
          </div>

          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg min-w-[120px] text-center">
            <div
              className={`text-lg font-bold ${
                phase === 'playback'
                  ? 'text-yellow-500'
                  : phase === 'input'
                    ? 'text-green-500'
                    : phase === 'correct'
                      ? 'text-blue-500'
                      : 'text-gray-500'
              }`}
            >
              {phaseLabel}
            </div>
          </div>
        </div>

        {/* Item Grid */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex flex-wrap justify-center gap-4">
            {items.map((item, index) => {
              const isActive = phase === 'playback' && currentPlaybackIndex >= 0 && sequence[currentPlaybackIndex] === index
              const isCorrectFeedback = feedbackItem === index && feedbackType === 'correct'
              const isWrongFeedback = feedbackItem === index && feedbackType === 'wrong'
              const isDisabled = phase === 'playback' || phase === 'correct' || phase === 'game-over'

              return (
                <button
                  key={item.id}
                  onClick={() => handleTap(index)}
                  disabled={isDisabled}
                  tabIndex={0}
                  aria-label={t(item.label)}
                  aria-disabled={isDisabled}
                  className={`
                    min-w-16 max-w-28 w-20 h-20 md:w-28 md:h-28
                    rounded-2xl flex items-center justify-center
                    transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-purple-400
                    ${isDisabled && !isActive ? 'cursor-default' : 'cursor-pointer hover:brightness-110'}
                    ${isActive ? 'ring-4 ring-white scale-110 brightness-125 shadow-lg' : ''}
                    ${isCorrectFeedback ? 'ring-4 ring-green-400 scale-105' : ''}
                    ${isWrongFeedback ? 'ring-4 ring-red-400 scale-105' : ''}
                    ${!isActive && !isCorrectFeedback && !isWrongFeedback ? 'shadow-md' : ''}
                  `}
                  style={
                    item.type === 'color'
                      ? { backgroundColor: item.visual }
                      : { backgroundColor: '#f3f4f6' }
                  }
                >
                  {item.type !== 'color' && (
                    <span className="text-4xl md:text-5xl select-none">{item.visual}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Game Over Overlay */}
        {phase === 'game-over' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
              <div className="text-6xl mb-4">😵</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                {t('patternRecall.game.gameOver')}
              </h2>
              <p className="text-xl text-gray-600 mb-2">
                {t('patternRecall.game.roundsCompleted', { count: roundNumber - 1 })}
              </p>
              <p className="text-lg text-gray-500 mb-6">
                {t('patternRecall.game.totalTime', { time: formatTime(timer) })}
              </p>
              <button
                onClick={handleSeeScore}
                className="px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl text-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-xl"
              >
                {t('patternRecall.game.seeScore')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
