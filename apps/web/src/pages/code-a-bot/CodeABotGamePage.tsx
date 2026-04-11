import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  type BotDifficulty, type Instruction, type Level, type SimStep, type Position, type Direction,
  INSTRUCTIONS, DIR_ARROW, DIFFICULTY_CONFIG,
  getLevel, getTotalLevels, simulate,
} from '@/utils/codeABotUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type Phase = 'building' | 'running' | 'success' | 'fail' | 'submitting' | 'completed'

export default function CodeABotGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as BotDifficulty
  const totalLevels = getTotalLevels(difficulty)

  const [gameId, setGameId] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [level, setLevel] = useState<Level>(() => getLevel(difficulty, 1))
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [phase, setPhase] = useState<Phase>('building')
  const [simSteps, setSimSteps] = useState<SimStep[]>([])
  const [animStep, setAnimStep] = useState(-1)
  const [botPos, setBotPos] = useState<Position>(level.start)
  const [botDir, setBotDir] = useState<Direction>(level.startDir)
  const [timer, setTimer] = useState(0)
  const [levelsCompleted, setLevelsCompleted] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [failMessage, setFailMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start game on mount
  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({
          themeId: 'CODE_A_BOT',
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        }
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  // Timer
  useEffect(() => {
    if (phase === 'building') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
      }
    } else if (['submitting', 'completed'].includes(phase)) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => {}
  }, [phase])

  // Load level
  useEffect(() => {
    const lv = getLevel(difficulty, currentLevel)
    setLevel(lv)
    setBotPos(lv.start)
    setBotDir(lv.startDir)
    setInstructions([])
    setPhase('building')
    setSimSteps([])
    setAnimStep(-1)
    setShowHint(false)
    setFailMessage('')
  }, [currentLevel, difficulty])

  // Animate simulation
  useEffect(() => {
    if (phase !== 'running' || simSteps.length === 0) return
    if (animStep >= simSteps.length - 1) {
      // Animation done
      const lastStep = simSteps[simSteps.length - 1]
      if (lastStep.reachedGoal) {
        setPhase('success')
      } else if (!lastStep.alive) {
        setFailMessage(lastStep.fellInCrack ? 'Bot fell into a crack! 🕳️' : 'Bot crashed! 💥')
        setPhase('fail')
      } else {
        setFailMessage("Bot didn't reach the power cell 🤔")
        setPhase('fail')
      }
      return
    }
    animRef.current = setTimeout(() => {
      const nextIdx = animStep + 1
      setAnimStep(nextIdx)
      const step = simSteps[nextIdx]
      setBotPos(step.pos)
      setBotDir(step.dir)
    }, 400)
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [phase, animStep, simSteps])

  const addInstruction = (inst: Instruction) => {
    if (phase !== 'building') return
    if (instructions.length >= level.maxInstructions) return
    setInstructions(prev => [...prev, inst])
  }

  const removeInstruction = (index: number) => {
    if (phase !== 'building') return
    setInstructions(prev => prev.filter((_, i) => i !== index))
  }

  const clearInstructions = () => {
    if (phase !== 'building') return
    setInstructions([])
  }

  const runProgram = () => {
    if (instructions.length === 0) return
    setTotalAttempts(prev => prev + 1)
    const steps = simulate(level, instructions)
    setSimSteps(steps)
    setAnimStep(-1)
    setBotPos(level.start)
    setBotDir(level.startDir)
    setPhase('running')
  }

  const handleNextLevel = () => {
    const completed = levelsCompleted + 1
    setLevelsCompleted(completed)
    if (currentLevel >= totalLevels) {
      finishGame(completed)
    } else {
      setCurrentLevel(prev => prev + 1)
    }
  }

  const handleRetry = () => {
    setBotPos(level.start)
    setBotDir(level.startDir)
    setInstructions([])
    setSimSteps([])
    setAnimStep(-1)
    setPhase('building')
    setFailMessage('')
  }

  const finishGame = async (completed: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setPhase('submitting')
    try {
      const result = await completeGame({
        gameId,
        completionTime: Math.max(1, timer),
        attempts: totalAttempts,
        correctAnswers: completed,
        totalQuestions: totalLevels,
      })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setPhase('completed')
    } catch {
      setPhase('completed')
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // ── Cell rendering ─────────────────────────────────────────────────────────

  const cellSize = level.cols <= 5 ? 'w-12 h-12 md:w-14 md:h-14' : level.cols <= 6 ? 'w-10 h-10 md:w-12 md:h-12' : 'w-9 h-9 md:w-11 md:h-11'

  const renderCell = (row: number, col: number) => {
    const cell = level.grid[row][col]
    const isBot = botPos.row === row && botPos.col === col
    const isGoal = level.goal.row === row && level.goal.col === col

    let bg = 'bg-slate-700/50'
    let content = ''
    if (cell.type === 'wall')  { bg = 'bg-slate-500'; content = '🧱' }
    if (cell.type === 'crack') { bg = 'bg-red-900/60'; content = '🕳️' }
    if (cell.type === 'ice')   { bg = 'bg-cyan-400/40'; content = '🧊' }
    if (isGoal && !isBot)      { content = '⚡' }
    if (isBot)                 { content = '🤖' }

    return (
      <div
        key={`${row}-${col}`}
        className={`${cellSize} ${bg} rounded-lg border border-white/10 flex items-center justify-center text-lg md:text-xl transition-all duration-300 relative`}
      >
        {content}
        {isBot && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-cyan-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-black">
            {DIR_ARROW[botDir]}
          </span>
        )}
      </div>
    )
  }


  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-900 py-4 px-2 md:px-4 select-none">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.CODE_A_BOT_SETUP)} className="text-white text-lg font-bold hover:underline">
            {t('game.back')}
          </button>
          <div className="flex items-center gap-3 text-white font-bold text-sm md:text-base">
            <span>⏱️ {formatTime(timer)}</span>
            <span>Level {currentLevel}/{totalLevels}</span>
            <span className="text-cyan-300">{DIFFICULTY_CONFIG[difficulty].label}</span>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="flex justify-center">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: level.rows }, (_, r) =>
                Array.from({ length: level.cols }, (_, c) => renderCell(r, c))
              )}
            </div>
          </div>
        </div>

        {/* Instruction sequence */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm font-bold">
              Program ({instructions.length}/{level.maxInstructions})
            </span>
            {phase === 'building' && instructions.length > 0 && (
              <button onClick={clearInstructions} className="text-red-400 text-xs font-bold hover:text-red-300">
                Clear All ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[44px] bg-black/20 rounded-xl p-2">
            {instructions.length === 0 && (
              <span className="text-white/30 text-sm italic px-2 py-1">Drag instructions here...</span>
            )}
            {instructions.map((inst, i) => {
              const info = INSTRUCTIONS.find(x => x.id === inst)!
              const isActive = phase === 'running' && i === animStep
              return (
                <button
                  key={i}
                  onClick={() => removeInstruction(i)}
                  disabled={phase !== 'building'}
                  className={`${info.color} text-white text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                    isActive ? 'ring-2 ring-yellow-400 scale-110' : ''
                  } ${phase === 'building' ? 'hover:opacity-70 cursor-pointer' : ''}`}
                >
                  {info.icon}
                </button>
              )
            })}
          </div>
        </div>

        {/* Instruction palette + Run button */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {INSTRUCTIONS.map((inst) => {
              // Only show Jump on medium/hard
              if (inst.id === 'JUMP' && difficulty === 'easy') return null
              return (
                <button
                  key={inst.id}
                  onClick={() => addInstruction(inst.id)}
                  disabled={phase !== 'building' || instructions.length >= level.maxInstructions}
                  className={`${inst.color} text-white font-bold px-4 py-3 rounded-xl transition-all flex items-center gap-2 ${
                    phase === 'building' && instructions.length < level.maxInstructions
                      ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-lg'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="text-xl">{inst.icon}</span>
                  <span className="text-sm hidden md:inline">{inst.label}</span>
                </button>
              )
            })}

            <div className="w-px h-10 bg-white/20 mx-2 hidden md:block" />

            <button
              onClick={runProgram}
              disabled={phase !== 'building' || instructions.length === 0}
              className={`px-6 py-3 rounded-xl font-black text-lg transition-all flex items-center gap-2 ${
                phase === 'building' && instructions.length > 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              ▶ Run
            </button>
          </div>
        </div>

        {/* Hint */}
        {phase === 'building' && level.hint && (
          <div className="text-center mb-4">
            {showHint ? (
              <p className="text-yellow-300 text-sm font-bold">💡 {level.hint}</p>
            ) : (
              <button onClick={() => setShowHint(true)} className="text-white/40 text-sm hover:text-white/60">
                Need a hint? 💡
              </button>
            )}
          </div>
        )}

        {/* Success overlay */}
        {phase === 'success' && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
              <div className="text-5xl mb-3">⚡</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Level Complete!</h2>
              <p className="text-lg text-gray-600 mb-1">
                Solved in {instructions.length} instructions
              </p>
              <p className="text-gray-500 mb-4">
                {instructions.length <= level.optimalSteps ? '🌟 Optimal solution!' : `Optimal: ${level.optimalSteps} steps`}
              </p>
              <button
                onClick={handleNextLevel}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
              >
                {currentLevel >= totalLevels ? 'See Score 🏆' : 'Next Level →'}
              </button>
            </div>
          </div>
        )}

        {/* Fail overlay */}
        {phase === 'fail' && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
              <div className="text-5xl mb-3">💥</div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">{failMessage}</h2>
              <p className="text-gray-500 mb-4">Try a different sequence</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  Try Again 🔄
                </button>
                <button
                  onClick={() => finishGame(levelsCompleted)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-300"
                >
                  End Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Score Modal */}
      {phase === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.HUB)}
          scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => navigate(ROUTES.CODE_A_BOT_SETUP)}
          gameType="CODE_A_BOT"
        />
      )}

      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🤖</div>
            <p className="text-xl font-bold">{t('game.calculating')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
