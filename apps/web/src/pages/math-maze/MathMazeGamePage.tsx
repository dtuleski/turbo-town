import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { generateMaze, hasPathToExit } from '@/utils/mazeGenerator'
import type { MazeData, Position, GateInfo, DifficultyLevel } from '@/utils/mazeGenerator'
import { generateEquation, checkEquationAnswer } from '@/utils/mazeEquations'
import { calculateMazeScore } from '@/utils/mazeScoringUtils'
import type { MazeScoreBreakdown } from '@/utils/mazeScoringUtils'
import { MazeGrid } from '@/components/math-maze/MazeGrid'
import type { GateState } from '@/components/math-maze/MazeGrid'
import { GatePrompt } from '@/components/math-maze/GatePrompt'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { startGame, completeGame } from '@/api/game'

// ── Constants ──────────────────────────────────────────────────────────────

const TIME_LIMITS: Record<DifficultyLevel, number> = {
  easy: 180,
  medium: 240,
  hard: 300,
}

const DIFFICULTY_NUM: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

const SWIPE_THRESHOLD = 30

function posKey(row: number, col: number): string {
  return `${row}-${col}`
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Component ──────────────────────────────────────────────────────────────

type GameStatus = 'loading' | 'playing' | 'gate-prompt' | 'submitting' | 'completed'
type CompletionReason = 'exit-reached' | 'time-up' | 'no-path'

export default function MathMazeGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  const rawDifficulty = searchParams.get('difficulty') as DifficultyLevel | null
  const difficulty: DifficultyLevel =
    rawDifficulty && ['easy', 'medium', 'hard'].includes(rawDifficulty)
      ? rawDifficulty
      : 'easy'

  const timeLimit = TIME_LIMITS[difficulty]

  // ── Game state ───────────────────────────────────────────────────────────
  const [gameId, setGameId] = useState('')
  const [maze, setMaze] = useState<MazeData | null>(null)
  const [playerPosition, setPlayerPosition] = useState<Position>({ row: 0, col: 0 })
  const [gateStates, setGateStates] = useState<Map<string, GateState>>(new Map())
  const [collectedItems, setCollectedItems] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [gatesAttempted, setGatesAttempted] = useState(0)
  const [gatesSolved, setGatesSolved] = useState(0)
  const [gameStatus, setGameStatus] = useState<GameStatus>('loading')
  const [activeGate, setActiveGate] = useState<GateInfo | null>(null)
  const [completionReason, setCompletionReason] = useState<CompletionReason | undefined>()
  const [gateFeedback, setGateFeedback] = useState<
    { correct: boolean; correctAnswer?: number } | undefined
  >()

  // Score state
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [localScore, setLocalScore] = useState<MazeScoreBreakdown | null>(null)

  // Refs for stable access in callbacks
  const gameStatusRef = useRef(gameStatus)
  gameStatusRef.current = gameStatus
  const timeRemainingRef = useRef(timeRemaining)
  timeRemainingRef.current = timeRemaining
  const gatesAttemptedRef = useRef(gatesAttempted)
  gatesAttemptedRef.current = gatesAttempted
  const gatesSolvedRef = useRef(gatesSolved)
  gatesSolvedRef.current = gatesSolved
  const collectedItemsRef = useRef(collectedItems)
  collectedItemsRef.current = collectedItems
  const mazeRef = useRef(maze)
  mazeRef.current = maze
  const gameIdRef = useRef(gameId)
  gameIdRef.current = gameId

  // Touch tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // ── Initialize game ──────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({
          themeId: 'MATH_MAZE',
          difficulty: DIFFICULTY_NUM[difficulty],
        })
        setGameId(game.id)

        // Generate maze with real equations
        const generated = generateMaze(difficulty)
        // Replace placeholder equations with real ones
        for (const gate of generated.gates) {
          gate.equation = generateEquation(difficulty)
        }

        // Initialize gate states
        const initialGateStates = new Map<string, GateState>()
        for (const gate of generated.gates) {
          initialGateStates.set(posKey(gate.position.row, gate.position.col), 'locked')
        }

        setMaze(generated)
        setPlayerPosition(generated.start)
        setGateStates(initialGateStates)
        setTimeRemaining(timeLimit)
        setGameStatus('playing')
      } catch (error: any) {
        console.error('Failed to start Math Maze:', error)
        if (
          error?.message?.includes('Rate limit') ||
          error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED'
        ) {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else {
          navigate(ROUTES.MATH_MAZE_SETUP)
        }
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── End game ─────────────────────────────────────────────────────────────

  const endGame = useCallback(
    async (reason: CompletionReason) => {
      if (gameStatusRef.current === 'completed' || gameStatusRef.current === 'submitting') return
      setGameStatus('submitting')
      setCompletionReason(reason)

      const currentMaze = mazeRef.current
      const completionTime = timeLimit - timeRemainingRef.current

      // Calculate local score as fallback
      const localResult = calculateMazeScore({
        difficulty,
        completionTime,
        totalTime: timeLimit,
        gatesAttempted: gatesAttemptedRef.current,
        gatesSolved: gatesSolvedRef.current,
        collectiblesGathered: collectedItemsRef.current.size,
        totalCollectibles: currentMaze?.collectibles.length ?? 0,
        reachedExit: reason === 'exit-reached',
      })
      setLocalScore(localResult)

      try {
        const result = await completeGame({
          gameId: gameIdRef.current,
          completionTime,
          attempts: gatesAttemptedRef.current,
          correctAnswers: gatesSolvedRef.current,
          totalQuestions: currentMaze?.gates.length ?? 0,
        })
        if (result.scoreBreakdown) {
          setScoreBreakdown(result.scoreBreakdown)
        }
        if (result.leaderboardRank) {
          setLeaderboardRank(result.leaderboardRank)
        }
      } catch (error) {
        console.error('Failed to complete game:', error)
        // Use local score as fallback — already set above
      } finally {
        setGameStatus('completed')
      }
    },
    [difficulty, timeLimit],
  )

  // ── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (gameStatus !== 'playing' && gameStatus !== 'gate-prompt') return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          endGame('time-up')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, endGame])

  // ── Movement logic ───────────────────────────────────────────────────────

  const tryMove = useCallback(
    (dRow: number, dCol: number) => {
      if (!maze || gameStatus !== 'playing') return

      setPlayerPosition((pos) => {
        const nr = pos.row + dRow
        const nc = pos.col + dCol

        // Bounds check
        if (nr < 0 || nr >= maze.rows || nc < 0 || nc >= maze.cols) return pos

        const cell = maze.grid[nr][nc]
        const key = posKey(nr, nc)

        // Wall — can't move
        if (cell === 'wall') return pos

        // Blocked gate — can't move
        if (cell === 'gate' && gateStates.get(key) === 'blocked') return pos

        // Locked gate — show prompt
        if (cell === 'gate' && gateStates.get(key) === 'locked') {
          const gateInfo = maze.gates.find(
            (g) => g.position.row === nr && g.position.col === nc,
          )
          if (gateInfo) {
            setActiveGate(gateInfo)
            setGateFeedback(undefined)
            setGameStatus('gate-prompt')
          }
          return pos
        }

        // Collectible — pick it up
        if (cell === 'collectible' && !collectedItems.has(key)) {
          setCollectedItems((prev) => {
            const next = new Set(prev)
            next.add(key)
            return next
          })
        }

        // Exit — end game
        if (cell === 'exit') {
          const newPos = { row: nr, col: nc }
          // Use setTimeout to allow state update before ending
          setTimeout(() => endGame('exit-reached'), 0)
          return newPos
        }

        return { row: nr, col: nc }
      })
    },
    [maze, gameStatus, gateStates, collectedItems, endGame],
  )

  // ── Keyboard input ───────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatusRef.current !== 'playing') return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          tryMove(-1, 0)
          break
        case 'ArrowDown':
          e.preventDefault()
          tryMove(1, 0)
          break
        case 'ArrowLeft':
          e.preventDefault()
          tryMove(0, -1)
          break
        case 'ArrowRight':
          e.preventDefault()
          tryMove(0, 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tryMove])

  // ── Touch / swipe input ──────────────────────────────────────────────────

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (gameStatusRef.current !== 'playing') return
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (gameStatusRef.current !== 'playing' || !touchStartRef.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y
      touchStartRef.current = null

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return

      if (Math.abs(dx) > Math.abs(dy)) {
        tryMove(0, dx > 0 ? 1 : -1)
      } else {
        tryMove(dy > 0 ? 1 : -1, 0)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [tryMove])

  // ── Gate prompt handlers ─────────────────────────────────────────────────

  const handleGateSubmit = useCallback(
    (answer: number) => {
      if (!activeGate || !maze) return

      const key = posKey(activeGate.position.row, activeGate.position.col)
      const correct = checkEquationAnswer(activeGate.equation, answer)

      setGatesAttempted((prev) => prev + 1)

      if (correct) {
        setGatesSolved((prev) => prev + 1)
        setGateStates((prev) => {
          const next = new Map(prev)
          next.set(key, 'open')
          return next
        })
        setGateFeedback({ correct: true })

        // After feedback, close prompt and move player onto the gate cell
        setTimeout(() => {
          setActiveGate(null)
          setGateFeedback(undefined)
          setPlayerPosition(activeGate.position)
          setGameStatus('playing')
        }, 1000)
      } else {
        setGateStates((prev) => {
          const next = new Map(prev)
          next.set(key, 'blocked')
          return next
        })
        setGateFeedback({ correct: false, correctAnswer: activeGate.equation.answer })

        // After feedback, check if path to exit still exists
        setTimeout(() => {
          setActiveGate(null)
          setGateFeedback(undefined)
          setGameStatus('playing')

          // Build set of all blocked gates (including the one just blocked)
          const blockedGates = new Set<string>()
          const updatedStates = new Map(gateStates)
          updatedStates.set(key, 'blocked')
          for (const [gk, gs] of updatedStates) {
            if (gs === 'blocked') {
              // Convert from 'row-col' to 'row,col' format for hasPathToExit
              const [r, c] = gk.split('-')
              blockedGates.add(`${r},${c}`)
            }
          }

          const currentPos = playerPosition
          if (!hasPathToExit(maze.grid, currentPos, maze.exit, blockedGates)) {
            endGame('no-path')
          }
        }, 2000)
      }
    },
    [activeGate, maze, gateStates, playerPosition, endGame],
  )

  const handleGateClose = useCallback(() => {
    if (gateFeedback) return // Don't close during feedback
    setActiveGate(null)
    setGameStatus('playing')
  }, [gateFeedback])

  // ── Completion message ───────────────────────────────────────────────────

  const getCompletionMessage = (): string => {
    switch (completionReason) {
      case 'exit-reached':
        return t('mathMaze.mazeComplete')
      case 'time-up':
        return t('mathMaze.timeUp')
      case 'no-path':
        return t('mathMaze.noPath')
      default:
        return t('mathMaze.mazeComplete')
    }
  }

  // ── Map local score to ScoreBreakdown interface ──────────────────────────

  const getScoreBreakdownForModal = () => {
    if (scoreBreakdown) return scoreBreakdown

    if (!localScore) return null

    const completionTime = timeLimit - timeRemaining
    const accuracy =
      gatesAttempted > 0 ? gatesSolved / gatesAttempted : 0

    return {
      baseScore: localScore.baseScore,
      difficultyMultiplier: localScore.difficultyMultiplier,
      speedBonus: localScore.speedBonus,
      accuracyBonus: localScore.accuracyBonus,
      finalScore: localScore.finalScore,
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      completionTime,
      accuracy,
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (gameStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center">
        <div className="text-4xl text-white font-bold">{t('common.loading')}</div>
      </div>
    )
  }

  if (gameStatus === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
          <div className="text-2xl text-gray-700 font-bold">{getCompletionMessage()}</div>
        </div>
      </div>
    )
  }

  if (gameStatus === 'completed') {
    const breakdown = getScoreBreakdownForModal()
    if (breakdown) {
      return (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.MATH_MAZE_SETUP)}
          scoreBreakdown={breakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => window.location.reload()}
          gameType="MATH_MAZE"
        />
      )
    }

    // Fallback if no score data at all
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="text-4xl mb-4">
            {completionReason === 'exit-reached' ? '🏆' : '💪'}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{getCompletionMessage()}</h1>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(ROUTES.MATH_MAZE_SETUP)}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all"
            >
              {t('setup.mathChallenge.playAgain')}
            </button>
            <button
              onClick={() => navigate(ROUTES.HUB)}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              {t('setup.mathChallenge.backToHub')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing / gate-prompt state ──────────────────────────────────────────

  if (!maze) return null

  const totalCollectibles = maze.collectibles.length
  const totalGates = maze.gates.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 py-4 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* HUD */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          {/* Timer */}
          <div className="bg-white rounded-2xl px-4 py-2 shadow-lg">
            <div className="text-xs text-gray-500">{t('mathMaze.timerLabel')}</div>
            <div
              className={`text-xl font-bold ${timeRemaining <= 30 ? 'text-red-500' : 'text-gray-800'}`}
              aria-label={t('mathMaze.timerLabel')}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Gates */}
          <div className="bg-white rounded-2xl px-4 py-2 shadow-lg">
            <div className="text-xs text-gray-500">{t('mathMaze.gatesLabel')}</div>
            <div className="text-xl font-bold text-gray-800">
              {t('mathMaze.collected', { collected: gatesSolved, total: totalGates })}
            </div>
          </div>

          {/* Collectibles */}
          <div className="bg-white rounded-2xl px-4 py-2 shadow-lg">
            <div className="text-xs text-gray-500">{t('mathMaze.collectiblesLabel')}</div>
            <div className="text-xl font-bold text-yellow-600">
              {t('mathMaze.collected', { collected: collectedItems.size, total: totalCollectibles })}
            </div>
          </div>
        </div>

        {/* Maze Grid */}
        <MazeGrid
          maze={maze}
          playerPosition={playerPosition}
          gateStates={gateStates}
          collectedItems={collectedItems}
        />

        {/* Gate Prompt Overlay */}
        {gameStatus === 'gate-prompt' && activeGate && (
          <GatePrompt
            equation={activeGate.equation}
            onSubmit={handleGateSubmit}
            onClose={handleGateClose}
            feedback={gateFeedback}
          />
        )}
      </div>
    </div>
  )
}
