import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { ROUTES } from '@/config/constants'
import {
  type Difficulty,
  type Block,
  type BlockType,
  type BlockDefinition,
  type Level,
  type Position,
  type Direction,
  type ExecutionStep,
  BLOCK_DEFINITIONS,
  DIFFICULTY_CONFIG,
  getBlocksForDifficulty,
  getLevel,
  getTotalLevels,
  executeProgram,
  createBlock,
  insertBlock,
  removeBlock,
} from '@/utils/scratchCodingUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type Phase = 'building' | 'running' | 'success' | 'fail' | 'submitting' | 'completed'

// ── Direction arrow helper ──────────────────────────────────────────────────
const DIR_ARROW: Record<Direction, string> = {
  up: '↑', right: '→', down: '↓', left: '←',
}

// ── Category colors for palette headers ─────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  motion: 'bg-blue-500',
  control: 'bg-orange-500',
  events: 'bg-yellow-500',
}

const CATEGORY_LABELS: Record<string, string> = {
  motion: 'scratchCoding.categories.motion',
  control: 'scratchCoding.categories.control',
  events: 'scratchCoding.categories.events',
}

// ════════════════════════════════════════════════════════════════════════════
// BlockPalette — Categorized draggable blocks filtered by difficulty
// ════════════════════════════════════════════════════════════════════════════

interface BlockPaletteProps {
  difficulty: Difficulty
  disabled: boolean
  maxReached: boolean
  onBlockAdd: (type: BlockType) => void
}

function DraggablePaletteBlock({
  def,
  disabled,
  onBlockAdd,
}: {
  def: BlockDefinition
  disabled: boolean
  onBlockAdd: (type: BlockType) => void
}) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { type: def.type, source: 'palette' },
    disabled,
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !disabled && onBlockAdd(def.type)}
      disabled={disabled}
      className={`${def.color} text-white text-xs font-bold px-3 py-2 rounded-lg transition-all
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95 cursor-grab shadow-md'}
      `}
    >
      {t(def.label)}
      {def.hasParameter && (
        <span className="ml-1 text-white/70 text-[10px]">
          ({def.parameterDefault})
        </span>
      )}
    </button>
  )
}

function BlockPalette({ difficulty, disabled, maxReached, onBlockAdd }: BlockPaletteProps) {
  const { t } = useTranslation()
  const blocks = getBlocksForDifficulty(difficulty)
  const isDisabled = disabled || maxReached

  // Group by category
  const grouped = blocks.reduce<Record<string, BlockDefinition[]>>((acc, b) => {
    if (!acc[b.category]) acc[b.category] = []
    acc[b.category].push(b)
    return acc
  }, {})

  const categoryOrder = ['events', 'motion', 'control']

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-3 h-full">
      <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
        {t('scratchCoding.game.blocks', 'Blocks')}
      </h3>
      {maxReached && (
        <div className="text-yellow-300 text-[10px] font-bold mb-2">
          {t('scratchCoding.game.noMoreBlocks', 'Maximum blocks reached!')}
        </div>
      )}
      <div className="space-y-3">
        {categoryOrder.map((cat) => {
          const defs = grouped[cat]
          if (!defs) return null
          return (
            <div key={cat}>
              <div className={`${CATEGORY_COLORS[cat]} text-white text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 inline-block`}>
                {t(CATEGORY_LABELS[cat])}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {defs.map((def) => (
                  <DraggablePaletteBlock
                    key={def.type}
                    def={def}
                    disabled={isDisabled}
                    onBlockAdd={onBlockAdd}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// BlockEditor — Droppable workspace showing the player's program
// ════════════════════════════════════════════════════════════════════════════

interface BlockEditorProps {
  program: Block[]
  maxBlocks: number
  highlightedBlockId: string | null
  disabled: boolean
  onProgramChange: (program: Block[]) => void
  onParameterChange: (blockId: string, value: number) => void
}

function BlockEditor({
  program,
  maxBlocks,
  highlightedBlockId,
  disabled,
  onProgramChange,
  onParameterChange,
}: BlockEditorProps) {
  const { t } = useTranslation()
  const { isOver, setNodeRef } = useDroppable({ id: 'block-editor' })

  const handleRemove = (index: number) => {
    if (disabled) return
    onProgramChange(removeBlock(program, index))
  }

  const getBlockDef = (type: BlockType): BlockDefinition | undefined =>
    BLOCK_DEFINITIONS.find((d) => d.type === type)

  const renderBlock = (block: Block, index: number) => {
    const def = getBlockDef(block.type)
    if (!def) return null
    const isHighlighted = highlightedBlockId === block.id

    return (
      <div
        key={block.id}
        className={`${def.color} text-white text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5
          ${isHighlighted ? 'ring-2 ring-yellow-400 scale-105 shadow-lg shadow-yellow-400/30' : ''}
          ${disabled ? '' : 'cursor-pointer hover:opacity-80'}
        `}
        onClick={() => handleRemove(index)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRemove(index) }}
        aria-label={`${t(def.label)} - ${t('scratchCoding.game.clickToRemove', 'click to remove')}`}
      >
        <span>{t(def.label)}</span>
        {def.hasParameter && (
          <input
            type="number"
            value={block.parameter ?? def.parameterDefault}
            min={def.parameterMin}
            max={def.parameterMax}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = Math.max(def.parameterMin, Math.min(def.parameterMax, parseInt(e.target.value) || def.parameterDefault))
              onParameterChange(block.id, val)
            }}
            className="w-8 h-5 text-center text-xs font-bold bg-white/30 rounded border-0 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            aria-label={`${t(def.label)} parameter`}
          />
        )}
        {!disabled && (
          <span className="text-white/50 text-[10px] ml-1">✕</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider">
          {t('scratchCoding.game.program', 'Program')}
        </h3>
        <span className="text-white/40 text-xs font-bold">
          {t('scratchCoding.game.blocksUsed', '{{used}}/{{max}} blocks', {
            used: program.length,
            max: maxBlocks,
          })}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] bg-black/20 rounded-xl p-2 transition-all
          ${isOver ? 'ring-2 ring-cyan-400 bg-cyan-900/20' : ''}
        `}
      >
        {program.length === 0 ? (
          <span className="text-white/30 text-sm italic px-2 py-1">
            {t('scratchCoding.game.dragHere', 'Click or drag blocks here...')}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {program.map((block, i) => renderBlock(block, i))}
          </div>
        )}
      </div>
      {!disabled && program.length > 0 && (
        <button
          onClick={() => onProgramChange([])}
          className="text-red-400 text-xs font-bold mt-2 hover:text-red-300 self-end"
        >
          {t('scratchCoding.game.clearAll', 'Clear All ✕')}
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GameStage — Grid rendering with character animation
// ════════════════════════════════════════════════════════════════════════════

interface GameStageProps {
  level: Level
  characterPos: Position
  characterDir: Direction
  isAnimating: boolean
}

function GameStage({ level, characterPos, characterDir, isAnimating }: GameStageProps) {
  const gridSize = level.cols

  // Scale cell size based on grid dimensions
  const cellClass =
    gridSize <= 6
      ? 'w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl'
      : gridSize <= 7
        ? 'w-9 h-9 md:w-11 md:h-11 text-base md:text-lg'
        : 'w-8 h-8 md:w-10 md:h-10 text-sm md:text-base'

  const renderCell = (row: number, col: number) => {
    const cell = level.grid[row][col]
    const isChar = characterPos.row === row && characterPos.col === col
    const isGoal = level.goal.row === row && level.goal.col === col

    let bg = 'bg-slate-700/50'
    let content = ''

    if (cell === 'wall') {
      bg = 'bg-slate-500'
      content = '🧱'
    }
    if (isGoal && !isChar) {
      bg = 'bg-green-800/40'
      content = '⭐'
    }
    if (isChar) {
      content = '🐱'
    }

    return (
      <div
        key={`${row}-${col}`}
        className={`${cellClass} ${bg} rounded-lg border border-white/10 flex items-center justify-center transition-all ${
          isAnimating && isChar ? 'duration-300' : 'duration-100'
        } relative`}
      >
        {content}
        {isChar && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-black">
            {DIR_ARROW[characterDir]}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex items-center justify-center">
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: level.rows }, (_, r) =>
          Array.from({ length: level.cols }, (_, c) => renderCell(r, c))
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ScratchCodingGamePage — Main game orchestration
// ════════════════════════════════════════════════════════════════════════════

export default function ScratchCodingGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as Difficulty
  const totalLevels = getTotalLevels(difficulty)

  // ── Core game state ────────────────────────────────────────────────────
  const [gameId, setGameId] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [level, setLevel] = useState<Level>(() => getLevel(difficulty, 1))
  const [phase, setPhase] = useState<Phase>('building')
  const [program, setProgram] = useState<Block[]>([])

  // ── Execution / animation state ────────────────────────────────────────
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [animStep, setAnimStep] = useState(-1)
  const [characterPos, setCharacterPos] = useState<Position>(level.start)
  const [characterDir, setCharacterDir] = useState<Direction>(level.startDir)
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null)

  // ── Scoring / progress state ───────────────────────────────────────────
  const [timer, setTimer] = useState(0)
  const [levelsCompleted, setLevelsCompleted] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [failMessage, setFailMessage] = useState('')

  // ── Refs ────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── DnD sensors ────────────────────────────────────────────────────────
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  // ── Start game on mount ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({
          themeId: 'SCRATCH_CODING',
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)
      } catch (error: any) {
        if (
          error?.message?.includes('Rate limit') ||
          error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED'
        ) {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        }
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'submitting' && phase !== 'completed') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000)
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {}
  }, [phase])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animRef.current) clearTimeout(animRef.current)
    }
  }, [])

  // ── Load level ─────────────────────────────────────────────────────────
  useEffect(() => {
    const lv = getLevel(difficulty, currentLevel)
    setLevel(lv)
    setCharacterPos(lv.start)
    setCharacterDir(lv.startDir)
    setProgram([])
    setPhase('building')
    setExecutionSteps([])
    setAnimStep(-1)
    setHighlightedBlockId(null)
    setFailMessage('')
  }, [currentLevel, difficulty])

  // ── Animate execution steps ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' || executionSteps.length === 0) return

    if (animStep >= executionSteps.length - 1) {
      // Animation complete — determine outcome
      const lastStep = executionSteps[executionSteps.length - 1]
      if (lastStep.reachedGoal) {
        setPhase('success')
      } else if (!lastStep.alive) {
        setFailMessage(
          lastStep.hitWall
            ? t('scratchCoding.game.hitWall', 'Character hit a wall! 💥')
            : lastStep.outOfBounds
              ? t('scratchCoding.game.offGrid', 'Character went off the grid! 💥')
              : t('scratchCoding.game.didntReachGoal', "Character didn't reach the goal 🤔")
        )
        setPhase('fail')
      } else {
        setFailMessage(t('scratchCoding.game.didntReachGoal', "Character didn't reach the goal 🤔"))
        setPhase('fail')
      }
      setHighlightedBlockId(null)
      return
    }

    animRef.current = setTimeout(() => {
      const nextIdx = animStep + 1
      setAnimStep(nextIdx)
      const step = executionSteps[nextIdx]
      setCharacterPos(step.pos)
      setCharacterDir(step.dir)
      setHighlightedBlockId(step.blockId)
    }, 350)

    return () => {
      if (animRef.current) clearTimeout(animRef.current)
    }
  }, [phase, animStep, executionSteps, t])

  // ── Block manipulation ─────────────────────────────────────────────────
  const handleBlockAdd = useCallback(
    (type: BlockType) => {
      if (phase !== 'building') return
      const block = createBlock(type)
      const result = insertBlock(program, block, program.length, level.maxBlocks)
      if (result) setProgram(result)
    },
    [phase, program, level.maxBlocks]
  )

  const handleParameterChange = useCallback(
    (blockId: string, value: number) => {
      setProgram((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, parameter: value } : b))
      )
    },
    []
  )

  // ── DnD handler ────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || over.id !== 'block-editor') return
      if (phase !== 'building') return

      const data = active.data.current
      if (data?.source === 'palette' && data?.type) {
        const block = createBlock(data.type as BlockType)
        const result = insertBlock(program, block, program.length, level.maxBlocks)
        if (result) setProgram(result)
      }
    },
    [phase, program, level.maxBlocks]
  )

  // ── Run program ────────────────────────────────────────────────────────
  const runProgram = useCallback(() => {
    if (program.length === 0 || phase !== 'building') return
    setTotalAttempts((prev) => prev + 1)
    const steps = executeProgram(level, program)
    setExecutionSteps(steps)
    setAnimStep(-1)
    setCharacterPos(level.start)
    setCharacterDir(level.startDir)
    setHighlightedBlockId(null)
    setPhase('running')
  }, [program, phase, level])

  // ── Level progression ──────────────────────────────────────────────────
  const handleNextLevel = useCallback(() => {
    const completed = levelsCompleted + 1
    setLevelsCompleted(completed)
    if (currentLevel >= totalLevels) {
      finishGame(completed)
    } else {
      setCurrentLevel((prev) => prev + 1)
    }
  }, [levelsCompleted, currentLevel, totalLevels]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    setCharacterPos(level.start)
    setCharacterDir(level.startDir)
    setProgram([])
    setExecutionSteps([])
    setAnimStep(-1)
    setHighlightedBlockId(null)
    setPhase('building')
    setFailMessage('')
  }, [level])

  const finishGame = useCallback(
    async (completed: number) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
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
    },
    [gameId, timer, totalAttempts, totalLevels]
  )

  // ── Helpers ────────────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const isOptimal = program.length <= level.optimalBlocks

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-900 py-3 px-2 md:px-4 select-none">
        <div className="max-w-6xl mx-auto">
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-3 px-2">
            <button
              onClick={() => navigate('/scratch-coding/setup')}
              className="text-white text-sm font-bold hover:underline"
            >
              ← {t('game.back', 'Back')}
            </button>
            <div className="flex items-center gap-3 text-white font-bold text-sm">
              <span>⏱️ {formatTime(timer)}</span>
              <span>
                {t('scratchCoding.game.level', 'Level {{current}}/{{total}}', {
                  current: currentLevel,
                  total: totalLevels,
                })}
              </span>
              <span className="text-purple-300">
                {DIFFICULTY_CONFIG[difficulty].emoji} {DIFFICULTY_CONFIG[difficulty].label}
              </span>
            </div>
          </div>

          {/* ── Main 3-panel layout ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_260px] gap-3">
            {/* Left: Block Palette */}
            <div className="order-2 md:order-1">
              <BlockPalette
                difficulty={difficulty}
                disabled={phase !== 'building'}
                maxReached={program.length >= level.maxBlocks}
                onBlockAdd={handleBlockAdd}
              />
            </div>

            {/* Center: Game Stage */}
            <div className="order-1 md:order-2">
              <GameStage
                level={level}
                characterPos={characterPos}
                characterDir={characterDir}
                isAnimating={phase === 'running'}
              />
            </div>

            {/* Right: Block Editor */}
            <div className="order-3">
              <BlockEditor
                program={program}
                maxBlocks={level.maxBlocks}
                highlightedBlockId={highlightedBlockId}
                disabled={phase !== 'building'}
                onProgramChange={setProgram}
                onParameterChange={handleParameterChange}
              />
            </div>
          </div>

          {/* ── Run Button ──────────────────────────────────────────── */}
          <div className="flex justify-center mt-3">
            <button
              onClick={runProgram}
              disabled={phase !== 'building' || program.length === 0}
              className={`px-8 py-3 rounded-xl font-black text-lg transition-all flex items-center gap-2 ${
                phase === 'building' && program.length > 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              aria-label={t('scratchCoding.game.run', 'Run')}
            >
              ▶ {t('scratchCoding.game.run', 'Run')}
            </button>
          </div>

          {/* ── Success Overlay ──────────────────────────────────────── */}
          {phase === 'success' && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
                <div className="text-5xl mb-3">⭐</div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">
                  {t('scratchCoding.game.levelComplete', 'Level Complete!')}
                </h2>
                <p className="text-lg text-gray-600 mb-1">
                  {t('scratchCoding.game.blocksUsedCount', 'Solved in {{count}} blocks', {
                    count: program.length,
                  })}
                </p>
                <p className="text-gray-500 mb-4">
                  {isOptimal
                    ? `🌟 ${t('scratchCoding.game.optimalSolution', 'Optimal solution!')}`
                    : t('scratchCoding.game.optimalHint', 'Optimal: {{count}} blocks', {
                        count: level.optimalBlocks,
                      })}
                </p>
                <button
                  onClick={handleNextLevel}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  {currentLevel >= totalLevels
                    ? t('scratchCoding.game.seeScore', 'See Score 🏆')
                    : t('scratchCoding.game.nextLevel', 'Next Level →')}
                </button>
              </div>
            </div>
          )}

          {/* ── Fail Overlay ────────────────────────────────────────── */}
          {phase === 'fail' && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
                <div className="text-5xl mb-3">💥</div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">{failMessage}</h2>
                <p className="text-gray-500 mb-4">
                  {t('scratchCoding.game.tryDifferent', 'Try a different sequence')}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                  >
                    {t('scratchCoding.game.tryAgain', 'Try Again 🔄')}
                  </button>
                  <button
                    onClick={() => finishGame(levelsCompleted)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-300"
                  >
                    {t('scratchCoding.game.endGame', 'End Game')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Score Modal ───────────────────────────────────────────── */}
        {phase === 'completed' && scoreBreakdown && (
          <ScoreBreakdownModal
            isOpen={true}
            onClose={() => navigate(ROUTES.HUB)}
            scoreBreakdown={scoreBreakdown}
            leaderboardRank={leaderboardRank}
            onPlayAgain={() => navigate('/scratch-coding/setup')}
            gameType="SCRATCH_CODING"
          />
        )}

        {/* ── Submitting overlay ────────────────────────────────────── */}
        {phase === 'submitting' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4 animate-bounce">🧩</div>
              <p className="text-xl font-bold">{t('game.calculating', 'Calculating score...')}</p>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}
