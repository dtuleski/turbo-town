import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  pickWords,
  generateBubbles,
  ROUNDS_PER_GAME,
  MAX_LIVES,
  type BubbleDifficulty,
  type WordChallenge,
  type Bubble,
} from '@/utils/bubblePopUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

export default function BubblePopGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as BubbleDifficulty

  const [gameId, setGameId] = useState('')
  const [words, setWords] = useState<WordChallenge[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [nextLetterIndex, setNextLetterIndex] = useState(0) // which letter of the word we need next
  const [lives, setLives] = useState(MAX_LIVES)
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const wordsCompletedRef = useRef(0)
  const [timer, setTimer] = useState(0)
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'round-complete' | 'game-over' | 'submitting' | 'completed'>('loading')
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [shakeWrong, setShakeWrong] = useState<number | null>(null) // bubble id that was wrong
  const [popAnimation, setPopAnimation] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentWord = words[currentRound]

  // Initialize game
  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({
          themeId: 'BUBBLE_POP',
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)

        const picked = pickWords(difficulty, ROUNDS_PER_GAME)
        setWords(picked)
        setBubbles(generateBubbles(picked[0].word, difficulty))
        setGameStatus('playing')
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else {
          navigate(ROUTES.HUB)
        }
      }
    }
    init()
  }, [difficulty, navigate])

  // Timer
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameStatus])

  // Pop a bubble
  const popBubble = useCallback((bubble: Bubble) => {
    if (gameStatus !== 'playing' || bubble.popped || !currentWord) return

    const expectedLetter = currentWord.word[nextLetterIndex]

    if (bubble.letter === expectedLetter) {
      // Correct pop
      setPopAnimation(bubble.id)
      setTimeout(() => setPopAnimation(null), 400)

      setBubbles(prev => prev.map(b => b.id === bubble.id ? { ...b, popped: true } : b))
      setNextLetterIndex(prev => prev + 1)
      setTotalCorrect(prev => prev + 1)

      // Check if word is complete
      if (nextLetterIndex + 1 >= currentWord.word.length) {
        wordsCompletedRef.current += 1
        setWordsCompleted(wordsCompletedRef.current)
        // Move to next round or end game
        if (currentRound + 1 >= words.length) {
          // Game complete
          setTimeout(() => finishGame(), 500)
        } else {
          setGameStatus('round-complete')
        }
      }
    } else {
      // Wrong pop
      setShakeWrong(bubble.id)
      setTimeout(() => setShakeWrong(null), 500)
      setTotalWrong(prev => prev + 1)

      const newLives = lives - 1
      setLives(newLives)

      if (newLives <= 0) {
        // Game over
        if (timerRef.current) clearInterval(timerRef.current)
        setGameStatus('game-over')
      }
    }
  }, [gameStatus, currentWord, nextLetterIndex, lives, currentRound, words.length])

  // Next round
  const nextRound = useCallback(() => {
    const next = currentRound + 1
    setCurrentRound(next)
    setNextLetterIndex(0)
    setBubbles(generateBubbles(words[next].word, difficulty))
    setGameStatus('playing')
  }, [currentRound, words])

  // Finish game (all rounds complete or game over)
  const finishGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameStatus('submitting')

    try {
      const totalAttempts = totalCorrect + totalWrong
      const result = await completeGame({
        gameId,
        completionTime: timer,
        attempts: totalAttempts,
        correctAnswers: wordsCompletedRef.current,
        totalQuestions: ROUNDS_PER_GAME,
      })

      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setGameStatus('completed')
    } catch (error) {
      console.error('Failed to complete game:', error)
      setGameStatus('completed')
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (gameStatus === 'loading' || !currentWord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-rose-400 to-orange-400 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">Loading bubbles...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-rose-400 to-orange-400 py-4 px-2 md:px-4 select-none">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.BUBBLE_POP_SETUP)} className="text-white text-lg font-bold hover:underline">
            {t('game.back')}
          </button>
          <div className="flex items-center gap-3 text-white font-bold text-base md:text-lg">
            <span>⏱️ {formatTime(timer)}</span>
            <span>
              {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
            </span>
            <span>Round {currentRound + 1}/{ROUNDS_PER_GAME}</span>
          </div>
        </div>

        {/* Hint area */}
        <div className="bg-white/90 rounded-2xl shadow-xl p-4 mb-4 text-center">
          <div className="text-5xl mb-2">{currentWord.emoji}</div>
          <p className="text-lg text-gray-600 font-bold">{currentWord.hint}</p>
          {/* Spelled so far */}
          <div className="flex justify-center gap-1 mt-3">
            {currentWord.word.split('').map((letter, i) => (
              <div
                key={i}
                className={`w-9 h-11 md:w-11 md:h-13 flex items-center justify-center rounded-lg text-xl md:text-2xl font-black border-2 transition-all ${
                  i < nextLetterIndex
                    ? 'bg-green-100 border-green-400 text-green-700 scale-105'
                    : i === nextLetterIndex
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-600 animate-pulse'
                    : 'bg-gray-100 border-gray-300 text-transparent'
                }`}
              >
                {i < nextLetterIndex ? letter : '_'}
              </div>
            ))}
          </div>
        </div>

        {/* Bubble field */}
        <div className="relative bg-gradient-to-b from-sky-200 to-sky-100 rounded-2xl shadow-inner overflow-hidden"
          style={{ height: '400px' }}
        >
          {bubbles.map((bubble) => {
            if (bubble.popped) return null
            const isShaking = shakeWrong === bubble.id
            const isPopping = popAnimation === bubble.id

            return (
              <button
                key={bubble.id}
                type="button"
                onClick={() => popBubble(bubble)}
                className={`absolute flex items-center justify-center rounded-full
                  text-xl md:text-2xl font-black text-white
                  shadow-lg transition-transform
                  ${isPopping ? 'scale-150 opacity-0' : 'hover:scale-110 active:scale-95'}
                  ${isShaking ? 'animate-shake' : ''}
                `}
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  width: '52px',
                  height: '52px',
                  background: bubble.color,
                  animation: `float ${2 + bubble.delay}s ease-in-out infinite`,
                  animationDelay: `${bubble.delay}s`,
                  transform: isPopping ? 'scale(1.5)' : undefined,
                  transition: 'transform 0.3s, opacity 0.3s',
                }}
              >
                <span className="drop-shadow-md">{bubble.letter}</span>
                {/* Bubble shine */}
                <div
                  className="absolute rounded-full bg-white/40"
                  style={{ width: '14px', height: '10px', top: '8px', left: '10px' }}
                />
              </button>
            )
          })}

          {/* CSS animation for floating */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20% { transform: translateX(-8px); }
              40% { transform: translateX(8px); }
              60% { transform: translateX(-6px); }
              80% { transform: translateX(6px); }
            }
            .animate-shake {
              animation: shake 0.4s ease-in-out;
            }
          `}</style>
        </div>

        {/* Round complete overlay */}
        {gameStatus === 'round-complete' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Nice!</h2>
              <p className="text-xl text-gray-600 mb-1">
                You spelled <span className="font-black text-green-600">{currentWord.word}</span>!
              </p>
              <p className="text-gray-500 mb-4">
                Round {currentRound + 1} of {ROUNDS_PER_GAME} complete
              </p>
              <button
                onClick={nextRound}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xl font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
              >
                Next Word →
              </button>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {gameStatus === 'game-over' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
              <div className="text-5xl mb-3">💔</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Game Over!</h2>
              <p className="text-lg text-gray-600 mb-1">
                The word was <span className="font-black text-rose-600">{currentWord.word}</span>
              </p>
              <p className="text-gray-500 mb-4">
                You completed {wordsCompleted} of {ROUNDS_PER_GAME} words
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => finishGame()}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  See Score
                </button>
                <button
                  onClick={() => navigate(ROUTES.BUBBLE_POP_SETUP)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-300 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Score Modal */}
      {gameStatus === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.HUB)}
          scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => navigate(ROUTES.BUBBLE_POP_SETUP)}
          gameType="BUBBLE_POP"
        />
      )}

      {gameStatus === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🫧</div>
            <p className="text-xl font-bold">{t('game.calculating')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
