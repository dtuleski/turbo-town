import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  type Difficulty,
  type Command,
  type CommandType,
  type CommandDefinition,
  type Level,
  type Position,
  type Direction,
  type ExecutionStep,
  type InsertionCursor,
  type Condition,
  type SensorType,
  type ComparisonOperator,
  DIFFICULTY_CONFIG,
  getCommandsForDifficulty,
  getLevel,
  getTotalLevels,
  executeProgramV2,
  countAllLines,
  insertCommand,
  removeAtLine,
  buildLineMapping,
  programToText,
  computeLineEfficiency,
  generateObstacles,
} from '@/utils/scratchCodingUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type Phase = 'building' | 'running' | 'success' | 'fail' | 'submitting' | 'completed'

// ── Direction arrow helper ──────────────────────────────────────────────────
const DIR_ARROW: Record<Direction, string> = {
  up: '↑', right: '→', down: '↓', left: '←',
}

// ════════════════════════════════════════════════════════════════════════════
// CommandPalette — Clickable command buttons filtered by difficulty (Task 9)
// ════════════════════════════════════════════════════════════════════════════

interface CommandPaletteProps {
  difficulty: Difficulty
  disabled: boolean
  maxReached: boolean
  onCommandInsert: (type: CommandType) => void
}

function CommandPalette({ difficulty, disabled, maxReached, onCommandInsert }: CommandPaletteProps) {
  const { t } = useTranslation()
  const commands = getCommandsForDifficulty(difficulty)
  const isDisabled = disabled || maxReached

  // Split commands into regular and variable groups
  const VARIABLE_TYPES: CommandType[] = ['VAR_NUM_DECL', 'VAR_CHAR_DECL', 'VAR_NUM_INC', 'VAR_NUM_DEC']
  const regularCommands = commands.filter((def) => !VARIABLE_TYPES.includes(def.type))
  const variableCommands = commands.filter((def) => VARIABLE_TYPES.includes(def.type))

  const renderButton = (def: CommandDefinition) => (
    <button
      key={def.type}
      onClick={() => !isDisabled && onCommandInsert(def.type)}
      disabled={isDisabled}
      className={`bg-black border border-green-500/50 text-green-400 text-xs font-bold font-mono px-3 py-2 rounded-lg transition-all
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-green-900/30 hover:border-green-400 hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-green-900/20'}
      `}
      aria-label={t(def.label)}
    >
      {def.textRepresentation}
    </button>
  )

  return (
    <div className="bg-black/80 border border-green-500/30 rounded-xl p-3 h-full font-mono">
      <h3 className="text-green-400/60 text-xs font-bold uppercase tracking-wider mb-2">
        {t('scratchCoding.game.blocks', 'Commands')}
      </h3>
      {maxReached && (
        <div className="text-yellow-300 text-[10px] font-bold mb-2 animate-pulse">
          {t('spaceCoder.editor.maxLinesReached', 'Maximum lines reached!')}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {regularCommands.map(renderButton)}
      </div>
      {variableCommands.length > 0 && (
        <>
          <div className="border-t border-green-500/20 my-2" />
          <h4 className="text-green-400/50 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            {t('spaceCoder.variables.sectionTitle', 'Variables')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {variableCommands.map(renderButton)}
          </div>
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CodeEditor — Terminal-style code display with line numbers (Task 10)
// ════════════════════════════════════════════════════════════════════════════

interface CodeEditorProps {
  program: Command[]
  maxLines: number
  highlightedLineIndex: number | null
  insertionCursor: InsertionCursor
  disabled: boolean
  onLineSelect: (lineIndex: number) => void
  onLineRemove: (lineIndex: number) => void
  onLoopParameterChange: (commandId: string, value: number) => void
  onConditionChange: (commandId: string, condition: Condition) => void
  onVarValueChange: (commandId: string, value: number | string) => void
  onClearAll: () => void
}

function CodeEditor({
  program,
  maxLines,
  highlightedLineIndex,
  insertionCursor,
  disabled,
  onLineSelect,
  onLineRemove,
  onLoopParameterChange,
  onConditionChange,
  onVarValueChange,
  onClearAll,
}: CodeEditorProps) {
  const { t } = useTranslation()
  const lines = programToText(program)
  const lineCount = countAllLines(program)

  // Build a mapping from line index to command for loop parameter editing
  const lineToCommand = useRef<Map<number, Command>>(new Map())
  useEffect(() => {
    const map = new Map<number, Command>()
    function mapLines(cmds: Command[], startLine: number): number {
      let line = startLine
      for (const cmd of cmds) {
        map.set(line, cmd)
        if (cmd.type === 'LOOP') {
          line++
          line = mapLines(cmd.body ?? [], line)
          line++ // next
        } else if (cmd.type === 'IF') {
          line++
          line = mapLines(cmd.body ?? [], line)
          line++ // else
          line = mapLines(cmd.elseBody ?? [], line)
          line++ // end-if
        } else if (cmd.type === 'WHILE') {
          line++
          line = mapLines(cmd.body ?? [], line)
          line++ // end-while
        } else {
          line++
        }
      }
      return line
    }
    mapLines(program, 0)
    lineToCommand.current = map
  }, [program])

  // Compute the visual line index where the insertion cursor sits
  // This maps the InsertionCursor (parentId, branch, index) to a line number for the indicator
  const cursorLinePosition = (() => {
    if (lines.length === 0) return 0
    const { mappings } = buildLineMapping(program)
    const { parentId, branch, index } = insertionCursor

    if (parentId === null) {
      // Top-level cursor
      if (index >= program.length) return lines.length // after last line
      // Find the line index of the command at this position
      const target = mappings.find(
        (m) => m.lineType !== 'closing' && m.lineType !== 'else' && m.parentArray === undefined
      )
      // Fallback: count lines up to the index-th top-level command
      let linesBefore = 0
      for (let ci = 0; ci < Math.min(index, program.length); ci++) {
        const cmdMappings = mappings.filter(
          (m) => m.command.id === program[ci].id
        )
        if (cmdMappings.length > 0) {
          const lastMapping = cmdMappings[cmdMappings.length - 1]
          linesBefore = lastMapping.lineIndex + 1
        }
      }
      void target
      return linesBefore
    }

    // Cursor inside a control structure
    const parentMappings = mappings.filter((m) => m.command.id === parentId)
    if (parentMappings.length === 0) return lines.length

    const parentCmd = parentMappings[0].command
    const openingMapping = parentMappings.find((m) => m.lineType === 'opening')

    if (branch === 'elseBody') {
      const elseMapping = parentMappings.find((m) => m.lineType === 'else')
      if (!elseMapping) return lines.length
      const elseBodyCmds = parentCmd.elseBody ?? []
      if (index >= elseBodyCmds.length) {
        // After last item in elseBody — before the closing line
        const closingMapping = parentMappings.find((m) => m.lineType === 'closing')
        return closingMapping ? closingMapping.lineIndex : lines.length
      }
      // Before the index-th item in elseBody
      const childMappings = mappings.filter(
        (m) => elseBodyCmds[index] && m.command.id === elseBodyCmds[index].id
      )
      return childMappings.length > 0 ? childMappings[0].lineIndex : elseMapping.lineIndex + 1
    }

    // branch === 'body'
    if (!openingMapping) return lines.length
    const bodyCmds = parentCmd.body ?? []
    if (index >= bodyCmds.length) {
      // After last item in body
      if (parentCmd.type === 'IF') {
        const elseMapping = parentMappings.find((m) => m.lineType === 'else')
        return elseMapping ? elseMapping.lineIndex : lines.length
      }
      const closingMapping = parentMappings.find((m) => m.lineType === 'closing')
      return closingMapping ? closingMapping.lineIndex : lines.length
    }
    const childMappings = mappings.filter(
      (m) => bodyCmds[index] && m.command.id === bodyCmds[index].id
    )
    return childMappings.length > 0 ? childMappings[0].lineIndex : openingMapping.lineIndex + 1
  })()

  return (
    <div className="bg-black border border-green-500/30 rounded-xl p-3 h-full flex flex-col font-mono">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-green-400/60 text-xs font-bold uppercase tracking-wider">
          {t('scratchCoding.game.program', 'Program')}
        </h3>
        <span className="text-green-400/40 text-xs font-bold">
          {lineCount}/{maxLines}
        </span>
      </div>

      <div className="flex-1 min-h-[120px] overflow-y-auto bg-black rounded-lg p-2 scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
        {lines.length === 0 ? (
          <div className="text-green-500/30 text-sm italic px-2 py-1">
            {t('spaceCoder.editor.insertionHint', 'Click a command to insert it here')}
            <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col">
            {lines.map((line, i) => {
              const isHighlighted = highlightedLineIndex === i
              const cmd = lineToCommand.current.get(i)
              const isLoopLine = cmd?.type === 'LOOP' && line.trim().startsWith('loop(')
              const isIfLine = cmd?.type === 'IF' && line.trim().startsWith('if(')
              const isWhileLine = cmd?.type === 'WHILE' && line.trim().startsWith('while(')
              const isVarNumDeclLine = cmd?.type === 'VAR_NUM_DECL' && line.trim().startsWith('var-num =')
              const isVarCharDeclLine = cmd?.type === 'VAR_CHAR_DECL' && line.trim().startsWith("var-char =")
              const showCursorBefore = !disabled && cursorLinePosition === i

              // Determine condition mode for IF/WHILE lines
              const conditionMode = cmd?.condition?.type === 'comparison' ? 'compare' : 'sensor'

              return (
                <div key={i}>
                  {/* Insertion cursor indicator */}
                  {showCursorBefore && (
                    <div className="flex items-center gap-2 px-1 h-1 my-0.5">
                      <span className="w-5 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                    </div>
                  )}
                  <div
                    onClick={() => !disabled && onLineSelect(i)}
                    className={`flex items-center gap-2 px-1 py-0.5 rounded transition-all text-xs leading-5
                      ${isHighlighted ? 'bg-cyan-800/60 text-cyan-200' : ''}
                      ${!disabled && !isHighlighted ? 'hover:bg-green-900/20 cursor-pointer' : ''}
                      ${disabled ? '' : 'group'}
                    `}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === 'Enter' || e.key === ' ')) onLineSelect(i)
                    }}
                    aria-label={`Line ${i + 1}: ${line.trim()}`}
                  >
                    <span className="text-green-700 w-5 text-right select-none flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-green-400 whitespace-pre flex-1">
                      {isLoopLine && cmd ? (
                        <>
                          {line.match(/^(\s*)/)?.[0]}loop(
                          <input
                            type="number"
                            value={cmd.parameter ?? 2}
                            min={1}
                            max={20}
                            disabled={disabled}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 2))
                              onLoopParameterChange(cmd.id, val)
                            }}
                            className="w-8 h-4 text-center text-xs font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 inline-block mx-0"
                            aria-label="Loop count"
                          />
                          )
                        </>
                      ) : (isIfLine || isWhileLine) && cmd ? (
                        /* ── Inline condition editor for IF/WHILE (Task 7.2) ── */
                        <>
                          {line.match(/^(\s*)/)?.[0]}{isIfLine ? 'if(' : 'while('}
                          {/* Mode toggle: Sensor / Compare */}
                          <select
                            value={conditionMode}
                            disabled={disabled}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              if (e.target.value === 'sensor') {
                                onConditionChange(cmd.id, { type: 'sensor', sensor: 'obstacle-ahead' })
                              } else {
                                onConditionChange(cmd.id, { type: 'comparison', variable: 'var-num', operator: '<', value: 0 })
                              }
                            }}
                            className="h-4 text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0.5 px-0.5"
                            aria-label="Condition mode"
                          >
                            <option value="sensor">{t('spaceCoder.conditions.sensorMode', 'Sensor')}</option>
                            <option value="compare">{t('spaceCoder.conditions.comparisonMode', 'Compare')}</option>
                          </select>
                          {conditionMode === 'sensor' ? (
                            /* Sensor dropdown */
                            <select
                              value={(cmd.condition as { type: 'sensor'; sensor: SensorType })?.sensor ?? 'obstacle-ahead'}
                              disabled={disabled}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation()
                                onConditionChange(cmd.id, { type: 'sensor', sensor: e.target.value as SensorType })
                              }}
                              className="h-4 text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0.5 px-0.5"
                              aria-label="Sensor type"
                            >
                              <option value="obstacle-ahead">obstacle-ahead()</option>
                              <option value="at-goal">at-goal()</option>
                              <option value="not-at-goal">not-at-goal()</option>
                              <option value="edge-ahead">edge-ahead()</option>
                            </select>
                          ) : (
                            /* Comparison: variable, operator, value */
                            <>
                              <select
                                value={(cmd.condition as { type: 'comparison'; variable: string })?.variable ?? 'var-num'}
                                disabled={disabled}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  const variable = e.target.value as 'var-num' | 'var-char'
                                  const cond = cmd.condition as { type: 'comparison'; variable: string; operator: ComparisonOperator; value: number | string }
                                  const defaultVal = variable === 'var-num' ? 0 : 'a'
                                  onConditionChange(cmd.id, { type: 'comparison', variable, operator: cond?.operator ?? '<', value: defaultVal })
                                }}
                                className="h-4 text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0.5 px-0.5"
                                aria-label="Variable"
                              >
                                <option value="var-num">var-num</option>
                                <option value="var-char">var-char</option>
                              </select>
                              <select
                                value={(cmd.condition as { type: 'comparison'; operator: string })?.operator ?? '<'}
                                disabled={disabled}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  const cond = cmd.condition as { type: 'comparison'; variable: 'var-num' | 'var-char'; operator: ComparisonOperator; value: number | string }
                                  onConditionChange(cmd.id, { ...cond, operator: e.target.value as ComparisonOperator })
                                }}
                                className="h-4 text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0.5 w-5 text-center"
                                aria-label="Operator"
                              >
                                <option value="<">&lt;</option>
                                <option value=">">&gt;</option>
                                <option value="=">=</option>
                              </select>
                              {(cmd.condition as { type: 'comparison'; variable: string })?.variable === 'var-num' ? (
                                <input
                                  type="number"
                                  value={(cmd.condition as { type: 'comparison'; value: number })?.value ?? 0}
                                  min={-99}
                                  max={99}
                                  disabled={disabled}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    const cond = cmd.condition as { type: 'comparison'; variable: 'var-num' | 'var-char'; operator: ComparisonOperator; value: number | string }
                                    const val = Math.max(-99, Math.min(99, parseInt(e.target.value) || 0))
                                    onConditionChange(cmd.id, { ...cond, value: val })
                                  }}
                                  className="w-8 h-4 text-center text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0.5"
                                  aria-label="Comparison value"
                                />
                              ) : (
                                <select
                                  value={(cmd.condition as { type: 'comparison'; value: string })?.value ?? 'a'}
                                  disabled={disabled}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    const cond = cmd.condition as { type: 'comparison'; variable: 'var-num' | 'var-char'; operator: ComparisonOperator; value: number | string }
                                    onConditionChange(cmd.id, { ...cond, value: e.target.value })
                                  }}
                                  className="h-4 text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0.5 px-0.5"
                                  aria-label="Character value"
                                >
                                  {'abcdefghijklmnopqrstuvwxyz'.split('').map((ch) => (
                                    <option key={ch} value={ch}>{ch}</option>
                                  ))}
                                </select>
                              )}
                            </>
                          )}
                          )
                        </>
                      ) : isVarNumDeclLine && cmd ? (
                        /* ── Inline numeric value editor for VAR_NUM_DECL (Task 7.3) ── */
                        <>
                          {line.match(/^(\s*)/)?.[0]}var-num ={' '}
                          <input
                            type="number"
                            value={cmd.varValue as number ?? 0}
                            min={-99}
                            max={99}
                            disabled={disabled}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              const val = Math.max(-99, Math.min(99, parseInt(e.target.value) || 0))
                              onVarValueChange(cmd.id, val)
                            }}
                            className="w-8 h-4 text-center text-xs font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 inline-block mx-0"
                            aria-label="Variable initial value"
                          />
                        </>
                      ) : isVarCharDeclLine && cmd ? (
                        /* ── Inline char value editor for VAR_CHAR_DECL (Task 7.3) ── */
                        <>
                          {line.match(/^(\s*)/)?.[0]}var-char = &apos;
                          <select
                            value={(cmd.varValue as string) ?? 'a'}
                            disabled={disabled}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              onVarValueChange(cmd.id, e.target.value)
                            }}
                            className="h-4 text-[9px] font-bold bg-green-900/50 border border-green-500/30 rounded text-green-300 focus:outline-none focus:ring-1 focus:ring-green-400 mx-0 px-0.5"
                            aria-label="Character initial value"
                          >
                            {'abcdefghijklmnopqrstuvwxyz'.split('').map((ch) => (
                              <option key={ch} value={ch}>{ch}</option>
                            ))}
                          </select>
                          &apos;
                        </>
                      ) : (
                        line
                      )}
                    </span>
                    {!disabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onLineRemove(i)
                        }}
                        className="text-red-400/0 group-hover:text-red-400/70 text-[10px] flex-shrink-0 transition-all hover:text-red-300 cursor-pointer"
                        aria-label={`Remove line ${i + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {/* Insertion cursor at end if cursor is past all lines */}
            {!disabled && cursorLinePosition >= lines.length && (
              <div className="flex items-center gap-2 px-1 h-1 my-0.5">
                <span className="w-5 flex-shrink-0" />
                <div className="flex-1 h-0.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              </div>
            )}
            {/* Blinking cursor at end */}
            <div className="flex items-center gap-2 px-1 py-0.5 text-xs leading-5">
              <span className="text-green-700 w-5 text-right select-none flex-shrink-0">
                {lines.length + 1}
              </span>
              <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {!disabled && program.length > 0 && (
        <button
          onClick={onClearAll}
          className="text-red-400 text-xs font-bold mt-2 hover:text-red-300 self-end font-mono"
        >
          {t('scratchCoding.game.clearAll', 'Clear All ✕')}
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GameStage — Grid rendering with character animation (Task 11)
// ════════════════════════════════════════════════════════════════════════════

interface GameStageProps {
  level: Level
  characterPos: Position
  characterDir: Direction
  isAnimating: boolean
}

function GameStage({ level, characterPos, characterDir, isAnimating }: GameStageProps) {
  const gridSize = level.cols

  // Scale cell size based on grid dimensions (Task 11.1)
  const cellClass =
    gridSize <= 6
      ? 'w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl'
      : gridSize <= 8
        ? 'w-8 h-8 md:w-10 md:h-10 text-sm md:text-base'
        : 'w-5 h-5 md:w-7 md:h-7 text-[10px] md:text-sm' // 12×12

  const renderCell = (row: number, col: number) => {
    const cell = level.grid[row][col]
    const isChar = characterPos.row === row && characterPos.col === col
    const isGoal = level.goal.row === row && level.goal.col === col

    let bg = 'bg-slate-900/60'
    let content = ''

    // Subtle star decorations for empty cells
    if (cell === 'empty' && !isChar && !isGoal) {
      const hash = (row * 7 + col * 13) % 10
      if (hash < 2) content = '✦'
      else if (hash < 4) content = '·'
    }

    if (cell === 'wall') {
      bg = 'bg-slate-500'
      content = '🪨'
    }
    // Render obstacle cells as rocks (Task 11.1)
    if (cell === 'obstacle') {
      bg = 'bg-amber-900/40'
      content = '🪨'
    }
    if (isGoal && !isChar) {
      bg = 'bg-cyan-900/40'
      content = '🚀'
    }
    if (isChar) {
      content = '🧑‍🚀'
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
        className="inline-grid gap-0.5 border-2 border-cyan-500/30 rounded-xl p-1 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
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
// ScratchCodingGamePage — Main game orchestration (Task 13)
// ════════════════════════════════════════════════════════════════════════════

export default function ScratchCodingGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as Difficulty
  const totalLevels = getTotalLevels(difficulty)

  // ── Core game state (Task 13.1) ────────────────────────────────────────
  const [gameId, setGameId] = useState('')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [level, setLevel] = useState<Level>(() => {
    const lv = getLevel(difficulty, 1)
    // Generate obstacles for hard levels (Task 13.4)
    if (lv.generateObstacles && lv.obstacleCount) {
      const grid = generateObstacles(lv.rows, lv.cols, lv.start, lv.goal, lv.obstacleCount)
      return { ...lv, grid }
    }
    return lv
  })
  const [phase, setPhase] = useState<Phase>('building')
  const [program, setProgram] = useState<Command[]>([])
  const [insertionCursor, setInsertionCursor] = useState<InsertionCursor>({
    parentId: null,
    branch: 'body',
    index: 0,
  })

  // ── Execution / animation state ────────────────────────────────────────
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [animStep, setAnimStep] = useState(-1)
  const [characterPos, setCharacterPos] = useState<Position>(level.start)
  const [characterDir, setCharacterDir] = useState<Direction>(level.startDir)
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)

  // ── Scoring / progress state ───────────────────────────────────────────
  const [timer, setTimer] = useState(0)
  const [levelsCompleted, setLevelsCompleted] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [failMessage, setFailMessage] = useState('')

  // ── Level results tracking (for efficiency scoring) ─────────────────
  const [levelResults, setLevelResults] = useState<Array<{ optimalLines: number; actualLines: number }>>([])

  // ── Refs ────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const levelResultsRef = useRef<Array<{ optimalLines: number; actualLines: number }>>([])

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

  // ── Load level (Task 13.4) ─────────────────────────────────────────────
  useEffect(() => {
    const lv = getLevel(difficulty, currentLevel)
    let finalLevel = lv
    // Generate obstacles for hard levels
    if (lv.generateObstacles && lv.obstacleCount) {
      const grid = generateObstacles(lv.rows, lv.cols, lv.start, lv.goal, lv.obstacleCount)
      finalLevel = { ...lv, grid }
    }
    setLevel(finalLevel)
    setCharacterPos(finalLevel.start)
    setCharacterDir(finalLevel.startDir)
    setProgram([])
    setInsertionCursor({ parentId: null, branch: 'body', index: 0 })
    setPhase('building')
    setExecutionSteps([])
    setAnimStep(-1)
    setHighlightedLineIndex(null)
    setFailMessage('')
  }, [currentLevel, difficulty])

  // ── Animate execution steps (Task 13.3) ────────────────────────────────
  useEffect(() => {
    if (phase !== 'running' || executionSteps.length === 0) return

    if (animStep >= executionSteps.length - 1) {
      // Animation complete — determine outcome
      const lastStep = executionSteps[executionSteps.length - 1]
      if (lastStep.reachedGoal) {
        setPhase('success')
      } else if (!lastStep.alive) {
        // Use specific error messages based on errorType
        let msg: string
        switch (lastStep.errorType) {
          case 'no-obstacle-to-jump':
            msg = t('spaceCoder.errors.noObstacleToJump', 'Nothing to jump over! jump() needs an obstacle ahead 🤔')
            break
          case 'jump-landing-blocked':
            msg = t('spaceCoder.errors.jumpLandingBlocked', "Can't land there! The landing spot is blocked ☄️")
            break
          case 'infinite-loop':
            msg = t('spaceCoder.errors.infiniteLoop', 'Program ran too long! Check your loops 🔄')
            break
          case 'undefined-variable': {
            // Determine which variable is undefined by checking the command that caused the error
            const errorCmdId = lastStep.blockId
            let isVarChar = false
            // Search the program tree for the command
            function findCmd(cmds: Command[]): Command | undefined {
              for (const c of cmds) {
                if (c.id === errorCmdId) return c
                if (c.body) { const found = findCmd(c.body); if (found) return found }
                if (c.elseBody) { const found = findCmd(c.elseBody); if (found) return found }
              }
              return undefined
            }
            const errorCmd = findCmd(program)
            if (errorCmd) {
              if ((errorCmd.type === 'IF' || errorCmd.type === 'WHILE') && errorCmd.condition?.type === 'comparison') {
                isVarChar = errorCmd.condition.variable === 'var-char'
              }
              // VAR_NUM_INC and VAR_NUM_DEC always reference var-num
            }
            if (isVarChar) {
              msg = t('spaceCoder.errors.undefinedVarChar', "Variable not defined! Add var-char = '<value>' before using it.")
            } else {
              msg = t('spaceCoder.errors.undefinedVarNum', 'Variable not defined! Add var-num = <value> before using it.')
            }
            break
          }
          default:
            if (lastStep.hitObstacle) {
              msg = t('spaceCoder.errors.hitObstacle', 'Astronaut hit a rock! Use jump() to hop over obstacles 🪨')
            } else if (lastStep.hitWall) {
              msg = t('scratchCoding.game.hitWall', 'Astronaut hit an asteroid! ☄️')
            } else if (lastStep.outOfBounds) {
              msg = t('scratchCoding.game.offGrid', 'Astronaut drifted into space! ☄️')
            } else {
              msg = t('scratchCoding.game.didntReachGoal', "Astronaut didn't reach the airlock 🤔")
            }
        }
        setFailMessage(msg)
        setPhase('fail')
      } else {
        setFailMessage(t('scratchCoding.game.didntReachGoal', "Astronaut didn't reach the airlock 🤔"))
        setPhase('fail')
      }
      setHighlightedLineIndex(null)
      return
    }

    animRef.current = setTimeout(() => {
      const nextIdx = animStep + 1
      setAnimStep(nextIdx)
      const step = executionSteps[nextIdx]
      setCharacterPos(step.pos)
      setCharacterDir(step.dir)
      setHighlightedLineIndex(step.lineIndex ?? null)
    }, 350)

    return () => {
      if (animRef.current) clearTimeout(animRef.current)
    }
  }, [phase, animStep, executionSteps, t])

  // ── Command insertion (Task 13.2) ──────────────────────────────────────
  const handleCommandInsert = useCallback(
    (type: CommandType) => {
      if (phase !== 'building') return
      const maxLines = level.maxLines ?? level.maxBlocks
      if (countAllLines(program) >= maxLines) return
      const result = insertCommand(program, type, insertionCursor)
      setProgram(result.program)
      setInsertionCursor(result.cursor)
    },
    [phase, program, insertionCursor, level]
  )

  // ── Helper: find parent cursor position for a command by ID ──────────
  const findParentCursorForCommand = useCallback(
    (commands: Command[], targetId: string): { parentId: string | null; branch: 'body' | 'elseBody'; index: number } => {
      // Check top-level
      for (let i = 0; i < commands.length; i++) {
        if (commands[i].id === targetId) {
          return { parentId: null, branch: 'body', index: i }
        }
      }
      // Search recursively
      function search(
        cmds: Command[],
        parentId: string,
        branch: 'body' | 'elseBody',
      ): { parentId: string; branch: 'body' | 'elseBody'; index: number } | null {
        for (let i = 0; i < cmds.length; i++) {
          if (cmds[i].id === targetId) {
            return { parentId, branch, index: i }
          }
          const cmd = cmds[i]
          if (cmd.body) {
            const found = search(cmd.body, cmd.id, 'body')
            if (found) return found
          }
          if (cmd.elseBody) {
            const found = search(cmd.elseBody, cmd.id, 'elseBody')
            if (found) return found
          }
        }
        return null
      }
      for (const cmd of commands) {
        if (cmd.body) {
          const found = search(cmd.body, cmd.id, 'body')
          if (found) return found
        }
        if (cmd.elseBody) {
          const found = search(cmd.elseBody, cmd.id, 'elseBody')
          if (found) return found
        }
      }
      return { parentId: null, branch: 'body', index: 0 }
    },
    []
  )

  // ── Line removal (Task 13.2) ──────────────────────────────────────────
  const handleLineRemove = useCallback(
    (lineIndex: number) => {
      if (phase !== 'building') return
      const result = removeAtLine(program, lineIndex)
      setProgram(result.program)
      setInsertionCursor(result.cursor)
    },
    [phase, program]
  )

  // ── Line selection — move insertion cursor (Bug fix) ───────────────────
  const handleLineSelect = useCallback(
    (lineIndex: number) => {
      if (phase !== 'building') return
      const { mappings } = buildLineMapping(program)
      const mapping = mappings.find((m) => m.lineIndex === lineIndex)
      if (!mapping) return

      const { command: cmd, lineType } = mapping

      if (lineType === 'opening') {
        // Clicking a control structure opening line → cursor inside its body at index 0
        setInsertionCursor({ parentId: cmd.id, branch: 'body', index: 0 })
      } else if (lineType === 'else') {
        // Clicking an else line → cursor inside the else branch at index 0
        setInsertionCursor({ parentId: cmd.id, branch: 'elseBody', index: 0 })
      } else if (lineType === 'closing') {
        // Clicking a closing keyword → cursor after the control structure in its parent context
        const parentMapping = mappings.find(
          (m) => m.command.id === cmd.id && m.lineType === 'opening'
        )
        if (parentMapping) {
          // Find the parent of this control structure
          const parentOfStructure = findParentCursorForCommand(program, cmd.id)
          setInsertionCursor({
            parentId: parentOfStructure.parentId,
            branch: parentOfStructure.branch,
            index: parentOfStructure.index + 1,
          })
        } else {
          setInsertionCursor({ parentId: null, branch: 'body', index: program.length })
        }
      } else {
        // Simple command → cursor after this command in the same parent context
        const parentCursor = findParentCursorForCommand(program, cmd.id)
        setInsertionCursor({
          parentId: parentCursor.parentId,
          branch: parentCursor.branch,
          index: parentCursor.index + 1,
        })
      }
    },
    [phase, program]
  )

  // ── Loop parameter change (Task 13.2) ──────────────────────────────────
  const handleLoopParameterChange = useCallback(
    (commandId: string, value: number) => {
      function updateParam(cmds: Command[]): Command[] {
        return cmds.map((cmd) => {
          if (cmd.id === commandId) {
            return { ...cmd, parameter: value }
          }
          const updated: Command = { ...cmd }
          if (cmd.body) updated.body = updateParam(cmd.body)
          if (cmd.elseBody) updated.elseBody = updateParam(cmd.elseBody)
          return updated
        })
      }
      setProgram((prev) => updateParam(prev))
    },
    []
  )

  // ── Condition change for IF/WHILE (Task 7.2) ──────────────────────────
  const handleConditionChange = useCallback(
    (commandId: string, condition: Condition) => {
      function updateCond(cmds: Command[]): Command[] {
        return cmds.map((cmd) => {
          if (cmd.id === commandId) {
            return { ...cmd, condition }
          }
          const updated: Command = { ...cmd }
          if (cmd.body) updated.body = updateCond(cmd.body)
          if (cmd.elseBody) updated.elseBody = updateCond(cmd.elseBody)
          return updated
        })
      }
      setProgram((prev) => updateCond(prev))
    },
    []
  )

  // ── Variable value change for VAR_NUM_DECL/VAR_CHAR_DECL (Task 7.3) ──
  const handleVarValueChange = useCallback(
    (commandId: string, value: number | string) => {
      function updateVal(cmds: Command[]): Command[] {
        return cmds.map((cmd) => {
          if (cmd.id === commandId) {
            return { ...cmd, varValue: value }
          }
          const updated: Command = { ...cmd }
          if (cmd.body) updated.body = updateVal(cmd.body)
          if (cmd.elseBody) updated.elseBody = updateVal(cmd.elseBody)
          return updated
        })
      }
      setProgram((prev) => updateVal(prev))
    },
    []
  )

  // ── Clear all (Task 13.2) ──────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setProgram([])
    setInsertionCursor({ parentId: null, branch: 'body', index: 0 })
  }, [])

  // ── Run program (Task 13.3) ────────────────────────────────────────────
  const runProgram = useCallback(() => {
    if (program.length === 0 || phase !== 'building') return
    setTotalAttempts((prev) => prev + 1)
    const steps = executeProgramV2(level, program)
    setExecutionSteps(steps)
    setAnimStep(-1)
    setCharacterPos(level.start)
    setCharacterDir(level.startDir)
    setHighlightedLineIndex(null)
    setPhase('running')
  }, [program, phase, level])

  // ── Level progression (Task 13.4, 13.5) ────────────────────────────────
  const handleNextLevel = useCallback(() => {
    const optimalLines = level.optimalLines ?? level.optimalBlocks
    const actualLines = countAllLines(program)
    const result = { optimalLines, actualLines }
    const updatedResults = [...levelResults, result]
    setLevelResults(updatedResults)
    levelResultsRef.current = updatedResults

    const completed = levelsCompleted + 1
    setLevelsCompleted(completed)
    if (currentLevel >= totalLevels) {
      finishGame(completed)
    } else {
      setCurrentLevel((prev) => prev + 1)
    }
  }, [levelsCompleted, currentLevel, totalLevels, program, level, levelResults]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    setCharacterPos(level.start)
    setCharacterDir(level.startDir)
    setProgram([])
    setInsertionCursor({ parentId: null, branch: 'body', index: 0 })
    setExecutionSteps([])
    setAnimStep(-1)
    setHighlightedLineIndex(null)
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
        const efficiency = levelResultsRef.current.length > 0
          ? computeLineEfficiency(levelResultsRef.current)
          : 1.0
        const efficiencyWeightedCorrect = Math.round(completed * efficiency)

        const result = await completeGame({
          gameId,
          completionTime: Math.max(1, timer),
          attempts: totalAttempts,
          correctAnswers: efficiencyWeightedCorrect,
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

  const maxLines = level.maxLines ?? level.maxBlocks
  const optimalLines = level.optimalLines ?? level.optimalBlocks
  const lineCount = countAllLines(program)
  const isOptimal = lineCount <= optimalLines

  // ── Render (Task 13.6) ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 py-3 px-2 md:px-4 select-none">
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

        {/* ── Goal Banner ─────────────────────────────────────────── */}
        <div className="bg-indigo-500/20 border border-indigo-400/30 rounded-lg px-3 py-1.5 mb-3 flex items-center justify-between text-sm">
          <span className="text-indigo-200 font-medium font-mono">
            🎯 Reach the airlock with the fewest lines! Target: <strong className="text-white">{optimalLines} lines</strong>
          </span>
          <span className={`font-mono font-bold ${lineCount <= optimalLines ? 'text-green-400' : lineCount <= maxLines ? 'text-yellow-400' : 'text-red-400'}`}>
            {lineCount}/{maxLines}
          </span>
        </div>

        {/* ── Level Hint ──────────────────────────────────────────── */}
        {level.hint && (
          <div className="bg-purple-500/15 border border-purple-400/20 rounded-lg px-3 py-1.5 mb-3 text-sm">
            <span className="text-purple-200 font-medium">
              💡 {t(level.hint)}
            </span>
          </div>
        )}

        {/* ── Main 3-panel layout (Task 13.6) ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_320px] gap-3">
          {/* Left: Command Palette */}
          <div className="order-2 md:order-1">
            <CommandPalette
              difficulty={difficulty}
              disabled={phase !== 'building'}
              maxReached={lineCount >= maxLines}
              onCommandInsert={handleCommandInsert}
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

          {/* Right: Code Editor */}
          <div className="order-3">
            <CodeEditor
              program={program}
              maxLines={maxLines}
              highlightedLineIndex={highlightedLineIndex}
              insertionCursor={insertionCursor}
              disabled={phase !== 'building'}
              onLineSelect={handleLineSelect}
              onLineRemove={handleLineRemove}
              onLoopParameterChange={handleLoopParameterChange}
              onConditionChange={handleConditionChange}
              onVarValueChange={handleVarValueChange}
              onClearAll={handleClearAll}
            />
          </div>
        </div>

        {/* ── Run Button ──────────────────────────────────────────── */}
        <div className="flex justify-center mt-3">
          <button
            onClick={runProgram}
            disabled={phase !== 'building' || program.length === 0}
            className={`px-8 py-3 rounded-xl font-black text-lg transition-all flex items-center gap-2 font-mono ${
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
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">
                {t('scratchCoding.game.levelComplete', 'Level Complete!')}
              </h2>
              <p className="text-lg text-gray-600 mb-1">
                {t('scratchCoding.game.blocksUsedCount', 'Solved in {{count}} lines', {
                  count: lineCount,
                })}
                {' / '}
                {t('scratchCoding.game.optimalHint', 'Optimal: {{count}} lines', {
                  count: optimalLines,
                })}
              </p>
              <p className="text-lg mb-4">
                {isOptimal
                  ? t('spaceCoder.efficiency.perfectCode', 'Perfect Code ⚡')
                  : lineCount <= optimalLines + 2
                    ? t('spaceCoder.efficiency.cleanCode', 'Clean Code 👍')
                    : `🤔 ${t('scratchCoding.nesting.canImprove', 'Can improve — use fewer lines!')}`}
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
              <div className="text-5xl mb-3">☄️</div>
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

      {/* ── Score Modal (Task 13.5) ─────────────────────────────────── */}
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
            <div className="text-4xl mb-4 animate-bounce">🛸</div>
            <p className="text-xl font-bold">{t('game.calculating', 'Calculating score...')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
