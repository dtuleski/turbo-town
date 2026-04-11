import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { PHOTO_DESIGNS, DIFFICULTY_CONFIG, pixelizeImage, type PixelizedResult } from '@/utils/colorByNumberData'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type Phase = 'loading' | 'playing' | 'submitting' | 'completed'

export default function ColorByNumberGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as 'easy' | 'medium' | 'hard'
  const designId = searchParams.get('design') || 'sunset'
  const config = DIFFICULTY_CONFIG[difficulty]
  const design = PHOTO_DESIGNS.find(d => d.id === designId) || PHOTO_DESIGNS[0]

  const [gameId, setGameId] = useState('')
  const [pixelData, setPixelData] = useState<PixelizedResult | null>(null)
  const [painted, setPainted] = useState<boolean[][]>([])
  const [selectedColor, setSelectedColor] = useState(1)
  const [paintedCount, setPaintedCount] = useState(0)
  const [totalCells, setTotalCells] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [timer, setTimer] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [zoom, setZoom] = useState(1)
  const isPainting = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const result = pixelizeImage(design.emoji, config.gridSize, config.colors)
      setPixelData(result)
      setPainted(result.grid.map(row => row.map(() => false)))
      setTotalCells(result.grid.flat().length)
      setPhase('playing')
    } catch (err) { console.error('Failed to pixelize:', err) }
  }, [design.emoji, config.gridSize, config.colors])

  useEffect(() => {
    const init = async () => {
      try {
        const diffMap = { easy: 1, medium: 2, hard: 3 }
        const game = await startGame({ themeId: 'COLOR_BY_NUMBER', difficulty: diffMap[difficulty] })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED')
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const paintCell = useCallback((row: number, col: number) => {
    if (phase !== 'playing' || !pixelData) return
    const { grid } = pixelData
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return
    if (painted[row][col]) return
    const cellColor = grid[row][col]
    if (cellColor === selectedColor) {
      setPainted(prev => { const next = prev.map(r => [...r]); next[row][col] = true; return next })
      setPaintedCount(prev => { const n = prev + 1; if (n >= totalCells) setTimeout(() => finishGame(), 200); return n })
    } else {
      setMistakes(m => m + 1)
    }
  }, [phase, pixelData, painted, selectedColor, totalCells]) // eslint-disable-line react-hooks/exhaustive-deps

  // getCellFromEvent uses getBoundingClientRect which already accounts for CSS transforms
  const getCellFromEvent = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!gridRef.current || !pixelData) return null
    const rect = gridRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cols = pixelData.grid[0].length
    const rows = pixelData.grid.length
    return { row: Math.floor(y / (rect.height / rows)), col: Math.floor(x / (rect.width / cols)) }
  }, [pixelData])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault(); isPainting.current = true
    const cell = getCellFromEvent(e); if (cell) paintCell(cell.row, cell.col)
  }, [getCellFromEvent, paintCell])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPainting.current) return; e.preventDefault()
    const cell = getCellFromEvent(e); if (cell) paintCell(cell.row, cell.col)
  }, [getCellFromEvent, paintCell])

  const handlePointerUp = useCallback(() => { isPainting.current = false }, [])

  useEffect(() => {
    const prevent = (e: TouchEvent) => { if (isPainting.current) e.preventDefault() }
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [])

  // Wheel zoom on the grid container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.min(5, Math.max(0.5, z - e.deltaY * 0.002)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const finishGame = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setPhase('submitting')
    try {
      const result = await completeGame({
        gameId, completionTime: Math.max(1, timer), attempts: totalCells + mistakes,
        correctAnswers: totalCells, totalQuestions: totalCells,
      })
      setScoreBreakdown(result.scoreBreakdown); setLeaderboardRank(result.leaderboardRank); setPhase('completed')
    } catch { setPhase('completed') }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const progress = totalCells > 0 ? (paintedCount / totalCells) * 100 : 0

  if (phase === 'loading' || !pixelData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" /><p className="text-white/80 font-bold">Pixelizing {design.name}...</p></div>
      </div>
    )
  }

  const { grid, palette } = pixelData
  const rows = grid.length
  const cols = grid[0].length
  const cellSize = difficulty === 'hard' ? 12 : difficulty === 'medium' ? 18 : 24

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 py-4 px-2 md:px-4 select-none">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.COLOR_BY_NUMBER_SETUP)} className="text-white text-lg font-bold hover:underline">{t('game.back')}</button>
          <div className="flex items-center gap-3 text-white font-bold text-sm md:text-base">
            <span>⏱️ {formatTime(timer)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="w-full bg-white/10 rounded-full h-3 mb-3 mx-2">
          <div className="bg-gradient-to-r from-pink-400 to-purple-400 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Zoom controls */}
        <div className="flex justify-center gap-2 mb-3">
          <button onClick={() => setZoom(z => Math.min(5, z + 0.5))}
            className="bg-white/20 hover:bg-white/30 text-white font-bold w-10 h-10 rounded-xl text-xl transition-all">+</button>
          <button onClick={() => setZoom(1)}
            className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 h-10 rounded-xl text-sm transition-all">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
            className="bg-white/20 hover:bg-white/30 text-white font-bold w-10 h-10 rounded-xl text-xl transition-all">−</button>
        </div>

        {/* Grid with zoom */}
        <div ref={containerRef} className="bg-white rounded-2xl p-2 md:p-3 mb-4 shadow-xl overflow-auto"
          style={{ maxHeight: '60vh' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: cols * cellSize, height: rows * cellSize }}>
            <div ref={gridRef} className="touch-none"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gridTemplateRows: `repeat(${rows}, ${cellSize}px)`, gap: '0px' }}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
              {grid.map((row, r) => row.map((cellColor, c) => {
                const isPaintedCell = painted[r][c]
                const isSelected = cellColor === selectedColor && !isPaintedCell
                const bgColor = isPaintedCell ? palette[cellColor] : '#F3F4F6'
                return (
                  <div key={`${r}-${c}`}
                    style={{ backgroundColor: bgColor, borderColor: isSelected ? palette[selectedColor] : '#E5E7EB', borderWidth: '0.5px', borderStyle: 'solid' }}
                    className={`flex items-center justify-center ${isSelected ? 'opacity-70' : ''}`}>
                    {!isPaintedCell && (
                      <span style={{ fontSize: difficulty === 'hard' ? '5px' : difficulty === 'medium' ? '7px' : '9px', color: '#9CA3AF', fontWeight: 700, userSelect: 'none' }}>
                        {cellColor}
                      </span>
                    )}
                  </div>
                )
              }))}
            </div>
          </div>
        </div>

        {/* Palette */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="flex flex-wrap justify-center gap-2">
            {palette.map((color, idx) => {
              if (idx === 0) return null
              const remaining = grid.flat().filter((c, i) => c === idx && !painted[Math.floor(i / cols)][i % cols]).length
              return (
                <button key={idx} onClick={() => setSelectedColor(idx)}
                  className={`relative rounded-xl transition-all ${selectedColor === idx ? 'ring-4 ring-white scale-110 shadow-lg' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color, width: 40, height: 40 }}>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black"
                    style={{ color: isLightColor(color) ? '#333' : '#FFF' }}>
                    {remaining > 0 ? remaining : '✓'}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="text-center mt-2 text-white/60 text-xs">Tap a color, drag to paint · Scroll or +/− to zoom</div>
        </div>
      </div>

      {phase === 'completed' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full text-center shadow-2xl">
            <div className="text-4xl mb-2">🎨</div>
            <h2 className="text-2xl font-black mb-4">Masterpiece Complete!</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-bold">Your Painting</p>
                <div className="bg-gray-100 rounded-xl p-1">
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0 }}>
                    {grid.map((row, r) => row.map((cellColor, c) => (
                      <div key={`r-${r}-${c}`} style={{ backgroundColor: palette[cellColor], aspectRatio: '1' }} />
                    )))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-bold">Original</p>
                <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4">
                  <span className="text-8xl">{design.emoji}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-4">⏱️ {formatTime(timer)} · {design.name}</div>
            {scoreBreakdown && (
              <ScoreBreakdownModal isOpen={true} onClose={() => navigate(ROUTES.HUB)} scoreBreakdown={scoreBreakdown}
                leaderboardRank={leaderboardRank} onPlayAgain={() => navigate(ROUTES.COLOR_BY_NUMBER_SETUP)} gameType="COLOR_BY_NUMBER" />
            )}
          </div>
        </div>
      )}
      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center"><div className="text-4xl mb-4 animate-bounce">🎨</div><p className="text-xl font-bold">Finishing up...</p></div>
        </div>
      )}
    </div>
  )
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}
