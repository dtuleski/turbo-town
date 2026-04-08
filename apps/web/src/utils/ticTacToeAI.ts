// ── Tic Tac Toe AI ──────────────────────────────────────────────────────────

export type Cell = 'X' | 'O' | null
export type Board = Cell[]

export const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
]

export function checkWinner(board: Board): Cell {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

export function getWinningLine(board: Board): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
  }
  return null
}

export function isBoardFull(board: Board): boolean {
  return board.every(c => c !== null)
}

export function getEmptyCells(board: Board): number[] {
  return board.map((c, i) => c === null ? i : -1).filter(i => i !== -1)
}

// ── Easy AI: Random moves ───────────────────────────────────────────────────
function easyMove(board: Board): number {
  const empty = getEmptyCells(board)
  return empty[Math.floor(Math.random() * empty.length)]
}

// ── Medium AI: Block wins, take wins, otherwise random ──────────────────────
function mediumMove(board: Board): number {
  const empty = getEmptyCells(board)

  // 1. Win if possible
  for (const cell of empty) {
    const test = [...board]
    test[cell] = 'O'
    if (checkWinner(test) === 'O') return cell
  }

  // 2. Block opponent's win
  for (const cell of empty) {
    const test = [...board]
    test[cell] = 'X'
    if (checkWinner(test) === 'X') return cell
  }

  // 3. Take center if available
  if (board[4] === null) return 4

  // 4. Random
  return empty[Math.floor(Math.random() * empty.length)]
}

// ── Hard AI: Minimax (perfect play) ─────────────────────────────────────────
function minimax(board: Board, isMaximizing: boolean, depth: number): number {
  const winner = checkWinner(board)
  if (winner === 'O') return 10 - depth
  if (winner === 'X') return depth - 10
  if (isBoardFull(board)) return 0

  const empty = getEmptyCells(board)

  if (isMaximizing) {
    let best = -Infinity
    for (const cell of empty) {
      board[cell] = 'O'
      best = Math.max(best, minimax(board, false, depth + 1))
      board[cell] = null
    }
    return best
  } else {
    let best = Infinity
    for (const cell of empty) {
      board[cell] = 'X'
      best = Math.min(best, minimax(board, true, depth + 1))
      board[cell] = null
    }
    return best
  }
}

function hardMove(board: Board): number {
  const empty = getEmptyCells(board)
  let bestScore = -Infinity
  let bestMove = empty[0]

  for (const cell of empty) {
    board[cell] = 'O'
    const score = minimax(board, false, 0)
    board[cell] = null
    if (score > bestScore) {
      bestScore = score
      bestMove = cell
    }
  }
  return bestMove
}

// ── Public API ──────────────────────────────────────────────────────────────
export function getAIMove(board: Board, difficulty: string): number {
  switch (difficulty) {
    case 'easy': return easyMove(board)
    case 'medium': return mediumMove(board)
    case 'hard': return hardMove(board)
    default: return easyMove(board)
  }
}

export const ROUNDS_PER_GAME = 5
