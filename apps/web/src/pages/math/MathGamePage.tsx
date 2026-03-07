import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { generateQuestion, checkAnswer, type MathQuestion } from '@/utils/mathUtils'
import { startGame, completeGame } from '@/api/game'

const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Easy',
    emoji: '🟢',
    operations: ['addition', 'subtraction'] as const,
    questions: 10,
    timeLimit: 120,
  },
  medium: {
    name: 'Medium',
    emoji: '🟡',
    operations: ['addition', 'subtraction', 'multiplication', 'division'] as const,
    questions: 15,
    timeLimit: 180,
  },
  hard: {
    name: 'Hard',
    emoji: '🔴',
    operations: ['addition', 'subtraction', 'multiplication', 'division', 'power', 'root'] as const,
    questions: 20,
    timeLimit: 240,
  },
}

export default function MathGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = searchParams.get('difficulty') as keyof typeof DIFFICULTY_CONFIG

  const [gameId, setGameId] = useState<string>('')
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [userAnswer, setUserAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'completed'>('loading')
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: '',
  })

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      try {
        // Start game with backend
        const game = await startGame({
          themeId: 'MATH_CHALLENGE',
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)
        setTimeRemaining(config.timeLimit)
        setCurrentQuestion(generateQuestion(config.operations, difficulty))
        setGameStatus('playing')
      } catch (error) {
        console.error('Failed to start game:', error)
        navigate(ROUTES.HUB)
      }
    }
    initGame()
  }, [difficulty, config.timeLimit, config.operations, navigate])

  // Timer
  useEffect(() => {
    if (gameStatus !== 'playing') return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus])

  const endGame = useCallback(async () => {
    if (gameStatus === 'completed') return
    
    setGameStatus('completed')
    
    try {
      const completionTime = config.timeLimit - timeRemaining
      await completeGame({
        gameId,
        completionTime,
        attempts: questionNumber,
      })
    } catch (error) {
      console.error('Failed to complete game:', error)
    }
  }, [gameStatus, gameId, config.timeLimit, timeRemaining, questionNumber])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentQuestion || !userAnswer.trim()) return

    const isCorrect = checkAnswer(currentQuestion, parseFloat(userAnswer))
    
    if (isCorrect) {
      setScore((prev) => prev + 1)
      setFeedback({ show: true, correct: true, message: '✅ Correct!' })
    } else {
      setFeedback({ 
        show: true, 
        correct: false, 
        message: `❌ Wrong! Answer: ${currentQuestion.answer}` 
      })
    }

    // Move to next question or end game
    setTimeout(() => {
      setFeedback({ show: false, correct: false, message: '' })
      setUserAnswer('')
      
      if (questionNumber >= config.questions) {
        endGame()
      } else {
        setQuestionNumber((prev) => prev + 1)
        setCurrentQuestion(generateQuestion(config.operations, difficulty))
      }
    }, 1500)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (gameStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 flex items-center justify-center">
        <div className="text-4xl text-white font-bold">Loading...</div>
      </div>
    )
  }

  if (gameStatus === 'completed') {
    const percentage = Math.round((score / config.questions) * 100)
    const completionTime = config.timeLimit - timeRemaining
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">
              {percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : '💪'}
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              {percentage >= 80 ? 'Amazing!' : percentage >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </h1>
            
            <div className="space-y-4 mb-8">
              <div className="text-2xl font-bold text-gray-700">
                Score: {score} / {config.questions} ({percentage}%)
              </div>
              <div className="text-xl text-gray-600">
                Time: {formatTime(completionTime)}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate(ROUTES.MATH_SETUP)}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition-all"
              >
                Play Again
              </button>
              <button
                onClick={() => navigate(ROUTES.HUB)}
                className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header Stats */}
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">Question</div>
            <div className="text-2xl font-bold text-gray-800">
              {questionNumber} / {config.questions}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">Time</div>
            <div className={`text-2xl font-bold ${timeRemaining < 30 ? 'text-red-500' : 'text-gray-800'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">Score</div>
            <div className="text-2xl font-bold text-green-600">{score}</div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-12 mb-8">
          {currentQuestion && (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl font-black text-gray-800 mb-4">
                  {currentQuestion.question}
                </div>
                <div className="text-xl text-gray-600">
                  {config.emoji} {config.name} Level
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <input
                  type="number"
                  step="any"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="w-full px-6 py-4 text-3xl text-center border-4 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none"
                  autoFocus
                  disabled={feedback.show}
                />

                <button
                  type="submit"
                  disabled={!userAnswer.trim() || feedback.show}
                  className={`
                    w-full py-4 rounded-2xl text-2xl font-bold transition-all
                    ${
                      userAnswer.trim() && !feedback.show
                        ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  Submit Answer
                </button>
              </form>

              {/* Feedback */}
              {feedback.show && (
                <div
                  className={`
                    mt-6 p-4 rounded-2xl text-center text-2xl font-bold
                    ${feedback.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                  `}
                >
                  {feedback.message}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
