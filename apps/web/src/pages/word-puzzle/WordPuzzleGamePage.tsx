import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { generateWordPuzzle, checkWord, isValidSelection } from '@/utils/wordPuzzleUtils'
import { startGame, completeGame } from '@/api/game'

const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Easy',
    emoji: '🟢',
    timeLimit: 300, // 5 minutes
  },
  medium: {
    name: 'Medium',
    emoji: '🟡',
    timeLimit: 420, // 7 minutes
  },
  hard: {
    name: 'Hard',
    emoji: '🔴',
    timeLimit: 600, // 10 minutes
  },
}

interface Cell {
  row: number
  col: number
}

export default function WordPuzzleGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as keyof typeof DIFFICULTY_CONFIG

  const [gameId, setGameId] = useState<string>('')
  const [puzzle] = useState(generateWordPuzzle(difficulty))
  const [selectedCells, setSelectedCells] = useState<Cell[]>([])
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'completed'>('loading')
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: '',
  })

  const config = DIFFICULTY_CONFIG[difficulty]

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      try {
        const game = await startGame({
          themeId: 'ANIMALS', // Using existing theme for now
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)
        setTimeRemaining(config.timeLimit)
        setGameStatus('playing')
      } catch (error: any) {
        console.error('Failed to start game:', error)
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else {
          // Just start the game anyway without backend tracking
          setGameId('local-' + Date.now())
          setTimeRemaining(config.timeLimit)
          setGameStatus('playing')
        }
      }
    }
    initGame()
  }, [difficulty, config.timeLimit, navigate])

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

  // Check if all words found
  useEffect(() => {
    if (gameStatus === 'playing' && foundWords.size === puzzle.words.length) {
      endGame()
    }
  }, [foundWords, puzzle.words.length, gameStatus])

  const endGame = useCallback(async () => {
    if (gameStatus === 'completed') return
    
    setGameStatus('completed')
    
    try {
      const completionTime = config.timeLimit - timeRemaining
      await completeGame({
        gameId,
        completionTime,
        attempts: foundWords.size,
      })
    } catch (error) {
      console.error('Failed to complete game:', error)
    }
  }, [gameStatus, gameId, config.timeLimit, timeRemaining, foundWords.size])

  const handleMouseDown = (row: number, col: number) => {
    setIsSelecting(true)
    setSelectedCells([{ row, col }])
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (!isSelecting) return

    const newCell = { row, col }
    const lastCell = selectedCells[selectedCells.length - 1]

    // Check if cell is adjacent to last selected cell
    if (lastCell) {
      const rowDiff = Math.abs(row - lastCell.row)
      const colDiff = Math.abs(col - lastCell.col)
      
      // Must be adjacent (including diagonal)
      if (rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0)) {
        const newSelection = [...selectedCells, newCell]
        
        // Check if selection is valid (straight line)
        if (isValidSelection(newSelection)) {
          setSelectedCells(newSelection)
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (!isSelecting) return
    
    setIsSelecting(false)

    // Check if selected cells form a word
    const word = checkWord(puzzle.grid, selectedCells, puzzle.words)
    
    if (word && !foundWords.has(word)) {
      // Correct word found!
      setFoundWords(new Set([...foundWords, word]))
      setFeedback({ show: true, correct: true, message: `✅ Found: ${word}!` })
      
      setTimeout(() => {
        setFeedback({ show: false, correct: false, message: '' })
      }, 1500)
    } else if (word && foundWords.has(word)) {
      // Already found
      setFeedback({ show: true, correct: false, message: '⚠️ Already found!' })
      setTimeout(() => {
        setFeedback({ show: false, correct: false, message: '' })
      }, 1000)
    }
    
    setSelectedCells([])
  }

  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col)
  }

  const isCellInFoundWord = (_row: number, _col: number) => {
    // This is a simplified check - in a real implementation,
    // you'd track the exact positions of found words
    return false
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (gameStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center">
        <div className="text-4xl text-white font-bold">Loading...</div>
      </div>
    )
  }

  if (gameStatus === 'completed') {
    const percentage = Math.round((foundWords.size / puzzle.words.length) * 100)
    const completionTime = config.timeLimit - timeRemaining
    const allWordsFound = foundWords.size === puzzle.words.length
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">
              {allWordsFound ? '🏆' : percentage >= 60 ? '⭐' : '💪'}
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              {allWordsFound ? 'Perfect!' : percentage >= 60 ? 'Good Job!' : 'Keep Trying!'}
            </h1>
            
            <div className="space-y-4 mb-8">
              <div className="text-2xl font-bold text-gray-700">
                Words Found: {foundWords.size} / {puzzle.words.length} ({percentage}%)
              </div>
              <div className="text-xl text-gray-600">
                Time: {formatTime(completionTime)}
              </div>
              
              {/* Show missed words */}
              {foundWords.size < puzzle.words.length && (
                <div className="mt-6 p-4 bg-gray-100 rounded-2xl">
                  <h3 className="font-bold text-gray-700 mb-2">Missed Words:</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {puzzle.words
                      .filter(word => !foundWords.has(word))
                      .map(word => (
                        <span key={word} className="px-3 py-1 bg-red-200 text-red-700 rounded-lg font-bold">
                          {word}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Stats */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">Words Found</div>
            <div className="text-2xl font-bold text-green-600">
              {foundWords.size} / {puzzle.words.length}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">Time</div>
            <div className={`text-2xl font-bold ${timeRemaining < 60 ? 'text-red-500' : 'text-gray-800'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <div className="text-sm text-gray-600">Difficulty</div>
            <div className="text-2xl font-bold text-gray-800">
              {config.emoji} {config.name}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Word Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <div 
                className="grid gap-1 select-none"
                style={{ 
                  gridTemplateColumns: `repeat(${puzzle.gridSize}, minmax(0, 1fr))`,
                }}
                onMouseLeave={() => {
                  if (isSelecting) {
                    handleMouseUp()
                  }
                }}
              >
                {puzzle.grid.map((row, rowIndex) =>
                  row.map((letter, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`
                        aspect-square flex items-center justify-center
                        font-bold text-lg md:text-xl cursor-pointer
                        rounded-lg transition-all
                        ${isCellSelected(rowIndex, colIndex)
                          ? 'bg-blue-500 text-white scale-110'
                          : isCellInFoundWord(rowIndex, colIndex)
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }
                      `}
                      onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                      onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                      onMouseUp={handleMouseUp}
                    >
                      {letter}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Word List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Words to Find</h3>
              <div className="space-y-2">
                {puzzle.words.map((word) => (
                  <div
                    key={word}
                    className={`
                      px-4 py-3 rounded-xl font-bold text-lg transition-all
                      ${foundWords.has(word)
                        ? 'bg-green-100 text-green-700 line-through'
                        : 'bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback.show && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div
              className={`
                px-8 py-4 rounded-2xl text-2xl font-bold shadow-2xl
                ${feedback.correct ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}
              `}
            >
              {feedback.message}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
