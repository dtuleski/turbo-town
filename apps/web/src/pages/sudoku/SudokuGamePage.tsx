import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { generateSudoku, isGridComplete, hasConflict, type SudokuGrid, type SudokuDifficulty } from '@/utils/sudokuUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

export default function SudokuGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as SudokuDifficulty

  const [gameId, setGameId] = useState('')
  const [solution, setSolution] = useState<number[][] | null>(null)
  const [grid, setGrid] = useState<SudokuGrid | null>(null)
  const [initial, setInitial] = useState<boolean[][] | null>(null) // tracks given cells
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [timer, setTimer] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'submitting' | 'completed'>('loading')
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [notes, setNotes] = useState<Set<number>[][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()))
  )
  const [noteMode, setNoteMode] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize game
  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({ themeId: 'SUDOKU', difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3 })
        setGameId(game.id)

        const { puzzle: p, solution: s } = generateSudoku(difficulty)
        setSolution(s)
        setGrid(p.map(row => [...row]))
        setInitial(p.map(row => row.map(cell => cell !== null)))
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

  // Handle number input
  const handleNumber = useCallback((num: number) => {
    if (!grid || !selected || !initial || gameStatus !== 'playing') return
    const [row, col] = selected
    if (initial[row][col]) return // can't edit given cells

    if (noteMode) {
      setNotes(prev => {
        const next = prev.map(r => r.map(s => new Set(s)))
        if (next[row][col].has(num)) {
          next[row][col].delete(num)
        } else {
          next[row][col].add(num)
        }
        return next
      })
      return
    }

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = num

    // Clear notes for this cell
    setNotes(prev => {
      const next = prev.map(r => r.map(s => new Set(s)))
      next[row][col].clear()
      return next
    })

    // Check if wrong against solution
    if (solution && solution[row][col] !== num) {
      setMistakes(m => m + 1)
    }

    setGrid(newGrid)

    // Check completion
    if (isGridComplete(newGrid)) {
      handleComplete(newGrid)
    }
  }, [grid, selected, initial, solution, gameStatus, noteMode])

  // Handle erase
  const handleErase = useCallback(() => {
    if (!grid || !selected || !initial || gameStatus !== 'playing') return
    const [row, col] = selected
    if (initial[row][col]) return

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = null
    setGrid(newGrid)

    // Also clear notes
    setNotes(prev => {
      const next = prev.map(r => r.map(s => new Set(s)))
      next[row][col].clear()
      return next
    })
  }, [grid, selected, initial, gameStatus])

  // Keyboard input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9) {
        handleNumber(num)
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase()
      } else if (e.key === 'n' || e.key === 'N') {
        setNoteMode(m => !m)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleNumber, handleErase])

  // Complete game
  const handleComplete = async (_finalGrid: SudokuGrid) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameStatus('submitting')

    try {
      const totalCells = 81
      const givenCells = initial ? initial.flat().filter(Boolean).length : 0
      const filledCells = totalCells - givenCells

      const result = await completeGame({
        gameId,
        completionTime: timer,
        attempts: mistakes + filledCells,
        correctAnswers: filledCells - mistakes,
        totalQuestions: filledCells,
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

  if (gameStatus === 'loading' || !grid || !initial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">Generating puzzle...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 py-4 px-2 md:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <button onClick={() => navigate(ROUTES.SUDOKU_SETUP)} className="text-white text-lg font-bold hover:underline">
            ← Back
          </button>
          <div className="flex items-center gap-4 text-white font-bold text-lg">
            <span>⏱️ {formatTime(timer)}</span>
            <span>❌ {mistakes}</span>
            <span className="capitalize">{difficulty}</span>
          </div>
        </div>

        {/* Sudoku Grid */}
        <div className="bg-white rounded-2xl shadow-2xl p-3 md:p-4 mb-4">
          <div className="grid grid-cols-9 border-2 border-gray-800 aspect-square" role="grid" aria-label="Sudoku grid">
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isSelected = selected?.[0] === r && selected?.[1] === c
                const isGiven = initial[r][c]
                const conflict = cell !== null && !isGiven && hasConflict(grid, r, c)
                const sameValue = selected && grid[selected[0]][selected[1]] !== null && cell === grid[selected[0]][selected[1]]
                const sameRow = selected?.[0] === r
                const sameCol = selected?.[1] === c
                const sameBox = selected && Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)
                const highlighted = !isSelected && (sameRow || sameCol || sameBox)

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => setSelected([r, c])}
                    aria-label={`Row ${r + 1}, Column ${c + 1}${cell ? `, value ${cell}` : ', empty'}`}
                    className={`
                      relative flex items-center justify-center aspect-square text-lg md:text-2xl font-bold
                      transition-colors duration-100 select-none
                      ${c % 3 === 2 && c < 8 ? 'border-r-2 border-r-gray-800' : 'border-r border-r-gray-300'}
                      ${r % 3 === 2 && r < 8 ? 'border-b-2 border-b-gray-800' : 'border-b border-b-gray-300'}
                      ${isSelected ? 'bg-blue-200' : highlighted ? 'bg-blue-50' : sameValue && cell ? 'bg-blue-100' : 'bg-white'}
                      ${conflict ? 'text-red-500' : isGiven ? 'text-gray-800' : 'text-blue-600'}
                      hover:bg-blue-100
                    `}
                  >
                    {cell ? (
                      cell
                    ) : notes[r][c].size > 0 ? (
                      <div className="grid grid-cols-3 gap-0 text-[8px] md:text-[10px] text-gray-400 leading-tight w-full h-full p-0.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <span key={n} className="flex items-center justify-center">
                            {notes[r][c].has(n) ? n : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-2xl p-4 mb-4">
          {/* Note mode toggle */}
          <div className="flex justify-center mb-3">
            <button
              onClick={() => setNoteMode(m => !m)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                noteMode ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'
              }`}
            >
              ✏️ Notes {noteMode ? 'ON' : 'OFF'} (N)
            </button>
            <button
              onClick={handleErase}
              className="ml-3 px-4 py-2 rounded-xl font-bold text-sm bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
            >
              ⌫ Erase
            </button>
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-9 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              // Count how many of this number are placed
              const count = grid.flat().filter(v => v === num).length
              const allPlaced = count >= 9
              return (
                <button
                  key={num}
                  onClick={() => handleNumber(num)}
                  disabled={allPlaced}
                  className={`py-3 rounded-xl text-xl md:text-2xl font-bold transition-all ${
                    allPlaced
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95'
                  }`}
                >
                  {num}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Score Modal */}
      {gameStatus === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.HUB)}
          scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => navigate(ROUTES.SUDOKU_SETUP)}
          gameType="SUDOKU"
        />
      )}

      {gameStatus === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🎉</div>
            <p className="text-xl font-bold">Calculating score...</p>
          </div>
        </div>
      )}
    </div>
  )
}
