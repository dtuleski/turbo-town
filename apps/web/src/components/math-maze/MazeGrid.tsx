import React from 'react'
import type { MazeData, Position, CellType } from '@/utils/mazeGenerator'

export type GateState = 'locked' | 'open' | 'blocked'

export interface MazeGridProps {
  maze: MazeData
  playerPosition: Position
  gateStates: Map<string, GateState>
  collectedItems: Set<string>
  onCellClick?: (pos: Position) => void
}

function cellKey(row: number, col: number): string {
  return `${row}-${col}`
}

function getCellStyle(
  cellType: CellType,
  isPlayer: boolean,
  gateState: GateState | undefined,
  isCollected: boolean,
): string {
  const base = 'flex items-center justify-center aspect-square text-sm sm:text-base select-none transition-colors'

  if (isPlayer) {
    return `${base} bg-indigo-400 ring-2 ring-indigo-600`
  }

  switch (cellType) {
    case 'wall':
      return `${base} bg-gray-800`
    case 'path':
      return `${base} bg-gray-100`
    case 'gate':
      if (gateState === 'open') return `${base} bg-green-300`
      if (gateState === 'blocked') return `${base} bg-red-400`
      return `${base} bg-yellow-300`
    case 'collectible':
      return isCollected ? `${base} bg-gray-100` : `${base} bg-gray-100`
    case 'start':
      return `${base} bg-green-400`
    case 'exit':
      return `${base} bg-blue-400`
    default:
      return `${base} bg-gray-100`
  }
}

function getCellContent(
  cellType: CellType,
  isPlayer: boolean,
  gateState: GateState | undefined,
  isCollected: boolean,
): string {
  if (isPlayer) return '🧑'

  switch (cellType) {
    case 'gate':
      if (gateState === 'open') return ''
      if (gateState === 'blocked') return '🚫'
      return '🔒'
    case 'collectible':
      return isCollected ? '' : '⭐'
    case 'start':
      return '🟢'
    case 'exit':
      return '🚩'
    default:
      return ''
  }
}

function getCellLabel(
  cellType: CellType,
  row: number,
  col: number,
  isPlayer: boolean,
  gateState: GateState | undefined,
  isCollected: boolean,
): string {
  const pos = `Row ${row + 1}, Column ${col + 1}`
  if (isPlayer) return `${pos}: Player position`

  switch (cellType) {
    case 'wall':
      return `${pos}: Wall`
    case 'path':
      return `${pos}: Path`
    case 'gate':
      if (gateState === 'open') return `${pos}: Gate (open)`
      if (gateState === 'blocked') return `${pos}: Gate (blocked)`
      return `${pos}: Gate (locked)`
    case 'collectible':
      return isCollected ? `${pos}: Path (collected)` : `${pos}: Collectible star`
    case 'start':
      return `${pos}: Start`
    case 'exit':
      return `${pos}: Exit`
    default:
      return pos
  }
}

export const MazeGrid: React.FC<MazeGridProps> = ({
  maze,
  playerPosition,
  gateStates,
  collectedItems,
  onCellClick,
}) => {
  const { grid, cols } = maze

  return (
    <div
      role="grid"
      aria-label="Maze grid"
      className="w-full max-w-[90vw] sm:max-w-[80vw] md:max-w-[600px] lg:max-w-[700px] mx-auto"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1px' }}
    >
      {grid.map((row, rIdx) => (
        <React.Fragment key={rIdx}>
          {row.map((cellType, cIdx) => {
            const key = cellKey(rIdx, cIdx)
            const isPlayer = playerPosition.row === rIdx && playerPosition.col === cIdx
            const gateState = gateStates.get(key)
            const isCollected = collectedItems.has(key)

            return (
              <div
                key={key}
                role="gridcell"
                aria-label={getCellLabel(cellType, rIdx, cIdx, isPlayer, gateState, isCollected)}
                className={getCellStyle(cellType, isPlayer, gateState, isCollected)}
                onClick={() => onCellClick?.({ row: rIdx, col: cIdx })}
                tabIndex={onCellClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onCellClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onCellClick({ row: rIdx, col: cIdx })
                  }
                }}
              >
                {getCellContent(cellType, isPlayer, gateState, isCollected)}
              </div>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

export default MazeGrid
