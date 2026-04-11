import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { type Board, checkWinner, getWinningLine, isBoardFull, getAIMove, ROUNDS_PER_GAME } from '@/utils/ticTacToeAI'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { useTranslation } from 'react-i18next'

type RoundResult = 'win' | 'lose' | 'draw' | null
type GamePhase = 'playing' | 'round-end' | 'submitting' | 'completed'

const EMPTY_BOARD: Board = Array(9).fill(null)

export default function TicTacToeGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const difficulty = searchParams.get('difficulty') || 'easy'

  const [gameId, setGameId] = useState('')
  const [board, setBoard] = useState<Board>([...EMPTY_BOARD])
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [currentRound, setCurrentRound] = useState(0)
  const [roundResult, setRoundResult] = useState<RoundResult>(null)
  const [winLine, setWinLine] = useState<number[] | null>(null)
  const [gamePhase, setGamePhase] = useState<GamePhase>('playing')
  const [score, setScore] = useState(0)
  const [wins, setWins] = useState(0)
  const [draws, setDraws] = useState(0)
  const [losses, setLosses] = useState(0)
  const [timer, setTimer] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const diffMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
        const game = await startGame({ themeId: 'TIC_TAC_TOE', difficulty: diffMap[difficulty] || 1 })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED')
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // AI move
  useEffect(() => {
    if (isPlayerTurn || gamePhase !== 'playing' || roundResult) return
    const timeout = setTimeout(() => {
      const move = getAIMove([...board], difficulty)
      const newBoard = [...board]
      newBoard[move] = 'O'
      setBoard(newBoard)
      checkRoundEnd(newBoard)
      setIsPlayerTurn(true)
    }, 500) // slight delay for feel
    return () => clearTimeout(timeout)
  }, [isPlayerTurn, board, gamePhase, roundResult, difficulty]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkRoundEnd = useCallback((b: Board) => {
    const winner = checkWinner(b)
    const line = getWinningLine(b)
    if (winner) {
      setWinLine(line)
      if (winner === 'X') {
        setRoundResult('win')
        setScore(s => s + 300)
        setWins(w => w + 1)
      } else {
        setRoundResult('lose')
        setLosses(l => l + 1)
      }
      setGamePhase('round-end')
    } else if (isBoardFull(b)) {
      setRoundResult('draw')
      setScore(s => s + 100)
      setDraws(d => d + 1)
      setGamePhase('round-end')
    }
  }, [])

  const handleCellClick = useCallback((index: number) => {
    if (!isPlayerTurn || board[index] || gamePhase !== 'playing' || roundResult) return
    const newBoard = [...board]
    newBoard[index] = 'X'
    setBoard(newBoard)
    const winner = checkWinner(newBoard)
    if (winner || isBoardFull(newBoard)) {
      checkRoundEnd(newBoard)
    } else {
      setIsPlayerTurn(false)
    }
  }, [isPlayerTurn, board, gamePhase, roundResult, checkRoundEnd])

  const nextRound = () => {
    if (currentRound + 1 >= ROUNDS_PER_GAME) {
      finishGame()
    } else {
      setCurrentRound(r => r + 1)
      setBoard([...EMPTY_BOARD])
      setIsPlayerTurn(true)
      setRoundResult(null)
      setWinLine(null)
      setGamePhase('playing')
    }
  }

  const finishGame = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setGamePhase('submitting')
    try {
      const result = await completeGame({
        gameId, completionTime: Math.max(1, timer), attempts: wins + draws + losses,
        correctAnswers: wins, totalQuestions: ROUNDS_PER_GAME,
      })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setGamePhase('completed')
    } catch { setGamePhase('completed') }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-4 px-2 md:px-4 select-none">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.TIC_TAC_TOE_SETUP)} className="text-white text-lg font-bold hover:underline">{t('game.back')}</button>
          <div className="flex items-center gap-3 text-white font-bold text-sm">
            <span>⏱️ {formatTime(timer)}</span>
            <span>{t('game.round')} {currentRound + 1}/{ROUNDS_PER_GAME}</span>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="flex justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-2xl font-black text-green-400">{wins}</div>
            <div className="text-xs text-white/60">{t('gameplay.wins')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-yellow-400">{draws}</div>
            <div className="text-xs text-white/60">{t('gameplay.draws')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-red-400">{losses}</div>
            <div className="text-xs text-white/60">{t('gameplay.losses')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-white">{score}</div>
            <div className="text-xs text-white/60">{t('game.score')}</div>
          </div>
        </div>

        {/* Turn indicator */}
        {gamePhase === 'playing' && !roundResult && (
          <div className="text-center mb-4">
            <span className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${isPlayerTurn ? 'bg-blue-500 text-white' : 'bg-red-500/50 text-white/80'}`}>
              {isPlayerTurn ? `❌ ${t('gameplay.yourTurn')}` : `⭕ ${t('gameplay.aiThinking')}`}
            </span>
          </div>
        )}

        {/* Board */}
        <div className="flex justify-center mb-4">
          <div className="grid grid-cols-3 gap-2 bg-white/10 backdrop-blur rounded-2xl p-3">
            {board.map((cell, i) => {
              const isWinCell = winLine?.includes(i)
              return (
                <button key={i} onClick={() => handleCellClick(i)}
                  disabled={!!cell || gamePhase !== 'playing' || !isPlayerTurn}
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-xl text-5xl md:text-6xl font-black flex items-center justify-center transition-all ${
                    isWinCell ? 'bg-yellow-400/30 ring-2 ring-yellow-400' :
                    cell ? 'bg-white/10' :
                    gamePhase === 'playing' && isPlayerTurn ? 'bg-white/5 hover:bg-white/20 cursor-pointer' :
                    'bg-white/5 cursor-not-allowed'
                  }`}>
                  {cell === 'X' && <span className="text-blue-400 drop-shadow-lg">✕</span>}
                  {cell === 'O' && <span className="text-red-400 drop-shadow-lg">○</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Round result */}
        {gamePhase === 'round-end' && roundResult && (
          <div className="text-center mb-4">
            <div className={`text-3xl font-black mb-3 ${
              roundResult === 'win' ? 'text-green-400' : roundResult === 'draw' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {roundResult === 'win' ? `🎉 ${t('gameplay.youWin')}` : roundResult === 'draw' ? `🤝 ${t('gameplay.draw')}` : `💀 ${t('gameplay.aiWins')}`}
            </div>
            <button onClick={nextRound}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg">
              {currentRound + 1 >= ROUNDS_PER_GAME ? t('game.seeResults') : t('game.nextRound')}
            </button>
          </div>
        )}
      </div>

      {gamePhase === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal isOpen={true} onClose={() => navigate(ROUTES.HUB)} scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank} onPlayAgain={() => navigate(ROUTES.TIC_TAC_TOE_SETUP)} gameType="TIC_TAC_TOE" />
      )}
      {gamePhase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center"><div className="text-4xl mb-4 animate-bounce">❌⭕</div><p className="text-xl font-bold">{t('game.calculating')}</p></div>
        </div>
      )}
    </div>
  )
}
