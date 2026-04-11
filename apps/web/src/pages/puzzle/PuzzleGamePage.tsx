import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  GRID_SIZES,
  PUZZLE_IMAGES,
  generatePuzzleImageSVG,
  createPuzzlePieces,
  sliceImage,
  isPieceCorrect,
  isPuzzleComplete,
  type PuzzleDifficulty,
  type PuzzlePiece,
} from '@/utils/puzzleUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

export default function PuzzleGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as PuzzleDifficulty
  const imageId = searchParams.get('image') || 'sunset'
  const gridSize = GRID_SIZES[difficulty]

  const [gameId, setGameId] = useState('')
  const [pieces, setPieces] = useState<PuzzlePiece[]>([])
  const [pieceImages, setPieceImages] = useState<string[]>([])
  const [timer, setTimer] = useState(0)
  const [moves, setMoves] = useState(0)
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'submitting' | 'completed'>('loading')
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null)
  const [showReference, setShowReference] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const imageInfo = PUZZLE_IMAGES.find(i => i.id === imageId) || PUZZLE_IMAGES[0]
  const fullImageSrc = generatePuzzleImageSVG(imageInfo.id, 400)

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({
          themeId: 'JIGSAW_PUZZLE',
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)

        const imgSrc = generatePuzzleImageSVG(imageId, 400)
        const slices = await sliceImage(imgSrc, gridSize, 400)
        setPieceImages(slices)
        setPieces(createPuzzlePieces(gridSize))
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
  }, [difficulty, imageId, gridSize, navigate])

  // Timer
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameStatus])

  // Select a piece from tray or board
  const selectPiece = useCallback((pieceId: number) => {
    if (gameStatus !== 'playing') return
    setSelectedPieceId(prev => prev === pieceId ? null : pieceId)
  }, [gameStatus])

  // Place selected piece onto a board cell
  const placePiece = useCallback((targetRow: number, targetCol: number) => {
    if (gameStatus !== 'playing') return

    // If no piece selected, check if there's a piece on this cell to select it
    if (selectedPieceId === null) {
      const occupant = pieces.find(p => p.currentRow === targetRow && p.currentCol === targetCol)
      if (occupant) {
        setSelectedPieceId(occupant.id)
      }
      return
    }

    setPieces(prev => {
      const next = prev.map(p => ({ ...p }))

      // If there's already a piece in the target cell, send it back to tray
      const occupant = next.find(p => p.currentRow === targetRow && p.currentCol === targetCol)
      if (occupant && occupant.id !== selectedPieceId) {
        occupant.currentRow = null
        occupant.currentCol = null
      }

      // Place the selected piece
      const selected = next.find(p => p.id === selectedPieceId)!
      selected.currentRow = targetRow
      selected.currentCol = targetCol

      setMoves(m => m + 1)

      // Check completion
      if (isPuzzleComplete(next)) {
        setTimeout(() => handleComplete(next), 300)
      }

      return next
    })
    setSelectedPieceId(null)
  }, [selectedPieceId, pieces, gameStatus])

  // Send selected piece back to tray
  const returnToTray = useCallback(() => {
    if (selectedPieceId === null) return
    setPieces(prev => {
      const next = prev.map(p => ({ ...p }))
      const selected = next.find(p => p.id === selectedPieceId)!
      selected.currentRow = null
      selected.currentCol = null
      return next
    })
    setSelectedPieceId(null)
  }, [selectedPieceId])

  const handleComplete = async (finalPieces: PuzzlePiece[]) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameStatus('submitting')

    try {
      const totalPieces = finalPieces.length
      const correctPieces = finalPieces.filter(isPieceCorrect).length

      const result = await completeGame({
        gameId,
        completionTime: timer,
        attempts: moves,
        correctAnswers: correctPieces,
        totalQuestions: totalPieces,
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

  const trayPieces = pieces.filter(p => p.currentRow === null)

  if (gameStatus === 'loading' || pieceImages.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">Loading puzzle...</div>
      </div>
    )
  }

  const cellSize = Math.min(Math.floor(360 / gridSize), 100)
  const boardSize = cellSize * gridSize

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 py-4 px-2 md:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
          <button onClick={() => navigate(ROUTES.PUZZLE_SETUP)} className="text-white text-lg font-bold hover:underline">
            {t('game.back')}
          </button>
          <div className="flex items-center gap-4 text-white font-bold text-lg">
            <span>⏱️ {formatTime(timer)}</span>
            <span>🔄 {moves} moves</span>
            <span className="capitalize">{difficulty}</span>
          </div>
        </div>

        {/* Selected piece indicator */}
        {selectedPieceId !== null && (
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="bg-white/90 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg">
              <img
                src={pieceImages[selectedPieceId]}
                alt="Selected piece"
                className="w-10 h-10 rounded border-2 border-teal-500"
              />
              <span className="font-bold text-gray-700">Piece selected — tap a cell to place it</span>
              <button
                onClick={() => setSelectedPieceId(null)}
                className="ml-2 px-2 py-1 bg-gray-200 rounded-lg text-sm font-bold hover:bg-gray-300"
              >
                ✕
              </button>
              <button
                onClick={returnToTray}
                className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-200"
              >
                ↩ Tray
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Reference Image */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowReference(r => !r)}
              className="mb-2 px-3 py-1 bg-white/80 rounded-lg text-sm font-bold text-gray-700 hover:bg-white transition-all"
            >
              {showReference ? '👁️ Hide' : '👁️ Show'} Reference
            </button>
            {showReference && (
              <div className="bg-white rounded-2xl shadow-xl p-2">
                <img src={fullImageSrc} alt={imageInfo.name} className="rounded-xl" style={{ width: boardSize, height: boardSize }} />
                <p className="text-center text-sm font-bold text-gray-600 mt-1">{imageInfo.emoji} {imageInfo.name}</p>
              </div>
            )}
          </div>

          {/* Puzzle Board */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-2xl p-3">
              <div
                className="grid gap-0.5 bg-gray-300 p-0.5 rounded-lg"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                  width: boardSize + gridSize + 1,
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                  const row = Math.floor(idx / gridSize)
                  const col = idx % gridSize
                  const placedPiece = pieces.find(p => p.currentRow === row && p.currentCol === col)
                  const isCorrect = placedPiece ? isPieceCorrect(placedPiece) : false
                  const isTarget = selectedPieceId !== null && !placedPiece

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`relative transition-all ${
                        isCorrect ? 'ring-2 ring-green-400' : ''
                      } ${isTarget ? 'bg-teal-100 ring-2 ring-teal-300' : 'bg-gray-100'}`}
                      style={{ width: cellSize, height: cellSize }}
                      onClick={() => placePiece(row, col)}
                    >
                      {placedPiece ? (
                        <img
                          src={pieceImages[placedPiece.id]}
                          alt={`Piece ${placedPiece.id}`}
                          className={`w-full h-full ${selectedPieceId === placedPiece.id ? 'ring-2 ring-teal-500 brightness-110' : ''}`}
                          draggable={false}
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">{row + 1},{col + 1}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Piece Tray */}
        <div className="bg-white rounded-2xl shadow-2xl p-4 mt-4">
          <p className="text-center text-sm font-bold text-gray-500 mb-3">
            {trayPieces.length > 0 ? `📦 Pieces remaining: ${trayPieces.length}` : '✅ All pieces placed!'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center min-h-[60px]">
            {trayPieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className={`rounded-lg overflow-hidden border-2 transition-all ${
                  selectedPieceId === piece.id
                    ? 'border-teal-500 scale-110 shadow-lg ring-2 ring-teal-300'
                    : 'border-gray-200 hover:border-teal-300 hover:shadow-md active:scale-95'
                }`}
                style={{ width: cellSize * 0.8, height: cellSize * 0.8 }}
                onClick={() => selectPiece(piece.id)}
              >
                <img
                  src={pieceImages[piece.id]}
                  alt={`Puzzle piece ${piece.id + 1}`}
                  className="w-full h-full pointer-events-none"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-2">
          Tap a piece to select it, then tap a cell to place it.
        </p>
      </div>

      {/* Score Modal */}
      {gameStatus === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.HUB)}
          scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => navigate(ROUTES.PUZZLE_SETUP)}
          gameType="JIGSAW_PUZZLE"
        />
      )}

      {gameStatus === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🧩</div>
            <p className="text-xl font-bold">{t('game.calculating')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
