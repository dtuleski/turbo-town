import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import {
  type Difficulty,
  type Hole,
  getCourse,
  getTotalPar,
  getScoreName,
  difficultyToNumber,
  PHYSICS,
  DIFFICULTY_CONFIGS,
} from '@/utils/miniGolfData'
import {
  type BallState,
  type EnvironmentConditions,
  physicsTick,
  isBallMoving,
  calculatePower,
  calculateDirection,
  getWindmillBladeWalls,
  generateEnvironment,
  distance,
  scale,
} from '@/utils/miniGolfPhysics'

type GamePhase = 'loading' | 'aiming' | 'rolling' | 'sunk' | 'water-reset' | 'complete' | 'submitting'

// Canvas logical size (we draw at this resolution, CSS scales it)
const CW = 600
const CH = 600
// Scale from hole data (400×400) to canvas (600×600)
const S = CW / 400

export default function MiniGolfGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'easy'
  const config = DIFFICULTY_CONFIGS[difficulty]
  const course = getCourse(difficulty)

  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0)
  const [strokes, setStrokes] = useState<number[]>([])
  const [currentStrokes, setCurrentStrokes] = useState(0)
  const [totalStrokes, setTotalStrokes] = useState(0)
  const [timer, setTimer] = useState(0)
  const [ball, setBall] = useState<BallState>({
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    inSand: false, inWater: false, sunk: false,
  })
  const [env, setEnv] = useState<EnvironmentConditions>(generateEnvironment(difficulty))
  const [showHoleName, setShowHoleName] = useState(true)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ballRef = useRef<BallState>(ball)
  const phaseRef = useRef<GamePhase>(phase)
  const envRef = useRef<EnvironmentConditions>(env)

  const currentHole = course.holes[currentHoleIndex]
  useEffect(() => { ballRef.current = ball }, [ball])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { envRef.current = env }, [env])

  // ── Scaled hole helper (all physics runs at 600×600) ──
  function scaledHole(): Hole {
    return {
      ...currentHole,
      ball: { x: currentHole.ball.x * S, y: currentHole.ball.y * S },
      cup: { x: currentHole.cup.x * S, y: currentHole.cup.y * S },
      walls: currentHole.walls.map(w => ({
        start: { x: w.start.x * S, y: w.start.y * S },
        end: { x: w.end.x * S, y: w.end.y * S },
      })),
      obstacles: currentHole.obstacles.map(o => ({
        ...o,
        x: o.x * S, y: o.y * S,
        width: o.width ? o.width * S : undefined,
        height: o.height ? o.height * S : undefined,
        radius: o.radius ? o.radius * S : undefined,
      })),
      width: CW, height: CH,
    }
  }

  // ── Init ──
  useEffect(() => {
    const init = async () => {
      try {
        const result = await startGame({ themeId: 'MINI_GOLF', difficulty: difficultyToNumber(difficulty) })
        if (!result.canPlay) { navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true }, replace: true }); return }
        setGameId(result.id)
        resetHole(0)
        setPhase('aiming')
      } catch { navigate(ROUTES.MINI_GOLF_SETUP, { replace: true }) }
    }
    init()
    return () => { if (timerRef.current) clearInterval(timerRef.current); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'aiming' || phase === 'rolling') {
      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  function resetHole(idx: number) {
    const hole = course.holes[idx]
    setBall({ pos: { x: hole.ball.x * S, y: hole.ball.y * S }, vel: { x: 0, y: 0 }, inSand: false, inWater: false, sunk: false })
    setCurrentStrokes(0)
    setEnv(generateEnvironment(difficulty))
    setShowHoleName(true)
    setTimeout(() => setShowHoleName(false), 2000)
  }

  // ── Render loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let running = true
    const hole = scaledHole()

    function render() {
      if (!running || !ctx) return
      const now = Date.now()
      // Green background
      ctx.fillStyle = '#1b5e20'
      ctx.fillRect(0, 0, CW, CH)
      // Grass texture
      ctx.fillStyle = 'rgba(46, 125, 50, 0.3)'
      for (let i = 0; i < CW; i += 12) {
        for (let j = 0; j < CH; j += 12) {
          if ((i + j) % 24 === 0) ctx.fillRect(i, j, 6, 6)
        }
      }
      drawObstacles(ctx, hole, now)
      drawWalls(ctx, hole)
      drawCup(ctx, hole)
      drawBall(ctx, ballRef.current)
      drawGolfer(ctx, ballRef.current, now)
      drawAimLine(ctx)
      drawWindIndicator(ctx)

      if (phaseRef.current === 'rolling') {
        const newBall = physicsTick(ballRef.current, hole, now, envRef.current)
        ballRef.current = newBall
        setBall(newBall)
        if (newBall.sunk) handleHoleSunk()
        else if (newBall.inWater && !isBallMoving(newBall)) handleWaterReset()
        else if (!isBallMoving(newBall)) setPhase('aiming')
      }
      animRef.current = requestAnimationFrame(render)
    }
    render()
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [currentHoleIndex, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drawing ──
  function drawObstacles(ctx: CanvasRenderingContext2D, hole: Hole, time: number) {
    for (const obs of hole.obstacles) {
      if (obs.type === 'sand') {
        ctx.fillStyle = '#c8a96a'
        ctx.beginPath()
        ctx.roundRect(obs.x, obs.y, obs.width || 60, obs.height || 60, 8)
        ctx.fill()
        ctx.fillStyle = 'rgba(160, 120, 60, 0.4)'
        for (let i = 0; i < 12; i++) {
          ctx.beginPath()
          ctx.arc(obs.x + Math.random() * (obs.width || 60), obs.y + Math.random() * (obs.height || 60), 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (obs.type === 'water') {
        ctx.fillStyle = '#1565c0'
        ctx.beginPath()
        ctx.roundRect(obs.x, obs.y, obs.width || 60, obs.height || 60, 10)
        ctx.fill()
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
        ctx.lineWidth = 1.5
        const rx = obs.x + (obs.width || 60) / 2
        const ry = obs.y + (obs.height || 60) / 2
        ctx.beginPath()
        ctx.arc(rx, ry, 10 + Math.sin(time * 0.004) * 5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rx, ry, 18 + Math.cos(time * 0.003) * 4, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (obs.type === 'bumper') {
        const r = obs.radius || 21
        ctx.beginPath()
        ctx.arc(obs.x, obs.y, r, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(obs.x - 4, obs.y - 4, 2, obs.x, obs.y, r)
        grad.addColorStop(0, '#ff7043')
        grad.addColorStop(1, '#d32f2f')
        ctx.fillStyle = grad
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (obs.type === 'windmill') {
        ctx.beginPath()
        ctx.arc(obs.x, obs.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#5d4037'
        ctx.fill()
        const blades = getWindmillBladeWalls(obs, time)
        ctx.strokeStyle = '#4e342e'
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        for (const bw of blades) {
          ctx.beginPath()
          ctx.moveTo(bw.start.x, bw.start.y)
          ctx.lineTo(bw.end.x, bw.end.y)
          ctx.stroke()
        }
        ctx.strokeStyle = '#8d6e63'
        ctx.lineWidth = 5
        for (const bw of blades) {
          ctx.beginPath()
          ctx.moveTo(bw.start.x, bw.start.y)
          ctx.lineTo(bw.end.x, bw.end.y)
          ctx.stroke()
        }
      }
    }
  }

  function drawWalls(ctx: CanvasRenderingContext2D, hole: Hole) {
    // Shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    for (const w of hole.walls) {
      ctx.beginPath(); ctx.moveTo(w.start.x + 2, w.start.y + 2); ctx.lineTo(w.end.x + 2, w.end.y + 2); ctx.stroke()
    }
    // Main wall
    ctx.strokeStyle = '#5d4037'
    ctx.lineWidth = 7
    for (const w of hole.walls) {
      ctx.beginPath(); ctx.moveTo(w.start.x, w.start.y); ctx.lineTo(w.end.x, w.end.y); ctx.stroke()
    }
    // Highlight
    ctx.strokeStyle = '#8d6e63'
    ctx.lineWidth = 3
    for (const w of hole.walls) {
      ctx.beginPath(); ctx.moveTo(w.start.x, w.start.y); ctx.lineTo(w.end.x, w.end.y); ctx.stroke()
    }
  }

  function drawCup(ctx: CanvasRenderingContext2D, hole: Hole) {
    const cx = hole.cup.x, cy = hole.cup.y
    ctx.beginPath(); ctx.arc(cx, cy, PHYSICS.CUP_RADIUS * S + 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill()
    ctx.beginPath(); ctx.arc(cx, cy, PHYSICS.CUP_RADIUS * S, 0, Math.PI * 2)
    ctx.fillStyle = '#111'; ctx.fill()
    // Flag pole
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx + 3, cy - 36); ctx.lineTo(cx + 3, cy); ctx.stroke()
    // Flag
    ctx.fillStyle = '#e53935'
    ctx.beginPath(); ctx.moveTo(cx + 3, cy - 36); ctx.lineTo(cx + 22, cy - 28); ctx.lineTo(cx + 3, cy - 20); ctx.closePath(); ctx.fill()
  }

  function drawBall(ctx: CanvasRenderingContext2D, b: BallState) {
    if (b.sunk) return
    const r = PHYSICS.BALL_RADIUS * S
    ctx.beginPath(); ctx.arc(b.pos.x + 2, b.pos.y + 2, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill()
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, r, 0, Math.PI * 2)
    const grad = ctx.createRadialGradient(b.pos.x - 3, b.pos.y - 3, 1, b.pos.x, b.pos.y, r)
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#bdbdbd')
    ctx.fillStyle = grad; ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke()
  }

  function drawGolfer(ctx: CanvasRenderingContext2D, b: BallState, time: number) {
    if (b.sunk || phaseRef.current === 'rolling') return
    const bx = b.pos.x, by = b.pos.y
    // Position golfer to the left-bottom of the ball
    const gx = bx - 28, gy = by + 8
    // Idle breathing animation
    const breath = Math.sin(time * 0.003) * 1.5

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.ellipse(gx, gy + 32, 10, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    ctx.strokeStyle = '#1a237e'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(gx, gy + 14); ctx.lineTo(gx - 5, gy + 30); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(gx, gy + 14); ctx.lineTo(gx + 5, gy + 30); ctx.stroke()

    // Body
    ctx.strokeStyle = '#e53935'
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(gx, gy + 14); ctx.lineTo(gx, gy - 4 + breath); ctx.stroke()

    // Arms holding putter
    ctx.strokeStyle = '#ffccbc'
    ctx.lineWidth = 2.5
    // Left arm to club
    ctx.beginPath(); ctx.moveTo(gx, gy + 2); ctx.lineTo(gx + 12, gy + 8); ctx.stroke()
    // Right arm
    ctx.beginPath(); ctx.moveTo(gx, gy + 4); ctx.lineTo(gx + 14, gy + 12); ctx.stroke()

    // Putter (club)
    ctx.strokeStyle = '#9e9e9e'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(gx + 12, gy + 8); ctx.lineTo(bx - 10, by); ctx.stroke()
    // Club head
    ctx.strokeStyle = '#616161'
    ctx.lineWidth = 3.5
    ctx.beginPath(); ctx.moveTo(bx - 12, by - 3); ctx.lineTo(bx - 6, by + 3); ctx.stroke()

    // Head
    ctx.fillStyle = '#ffccbc'
    ctx.beginPath(); ctx.arc(gx, gy - 10 + breath, 7, 0, Math.PI * 2); ctx.fill()

    // Cap/visor
    ctx.fillStyle = '#1565c0'
    ctx.beginPath()
    ctx.ellipse(gx, gy - 14 + breath, 8, 4, -0.2, Math.PI, 0)
    ctx.fill()

    ctx.restore()
  }

  function drawAimLine(ctx: CanvasRenderingContext2D) {
    if (!isDragging || !dragStart || !dragEnd || phaseRef.current !== 'aiming') return
    const b = ballRef.current
    const dir = calculateDirection(b.pos, dragEnd)
    const power = calculatePower(distance(dragStart, dragEnd))
    const pn = power / PHYSICS.MAX_POWER
    const lineLen = pn * 120

    // Dotted aim line
    ctx.setLineDash([6, 6])
    ctx.strokeStyle = `rgba(255, 255, 80, ${0.5 + pn * 0.5})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(b.pos.x, b.pos.y)
    ctx.lineTo(b.pos.x + dir.x * lineLen, b.pos.y + dir.y * lineLen)
    ctx.stroke()
    ctx.setLineDash([])

    // Power ring around ball
    const r = PHYSICS.BALL_RADIUS * S + 5 + pn * 12
    ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = pn > 0.7 ? '#ef5350' : pn > 0.4 ? '#ffa726' : '#66bb6a'
    ctx.lineWidth = 3; ctx.stroke()

    // Power bar on canvas (top-center)
    const barW = 160, barH = 12, barX = (CW - barW) / 2, barY = 16
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath(); ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 8); ctx.fill()
    ctx.fillStyle = '#1b5e20'
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 6); ctx.fill()
    // Filled portion
    const fillW = barW * pn
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
    grad.addColorStop(0, '#66bb6a'); grad.addColorStop(0.5, '#fdd835'); grad.addColorStop(1, '#ef5350')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.roundRect(barX, barY, fillW, barH, 6); ctx.fill()
    // Label
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`Power: ${Math.round(pn * 100)}%`, CW / 2, barY + barH + 14)
  }

  function drawWindIndicator(ctx: CanvasRenderingContext2D) {
    // Small compass-style wind arrow in corner
    const cx = CW - 40, cy = 40
    const rad = (envRef.current.windDirection * Math.PI) / 180
    const len = 10 + envRef.current.windSpeed * 1.2
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke()
    // Arrow
    const ex = cx + Math.cos(rad) * len, ey = cy + Math.sin(rad) * len
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey)
    ctx.strokeStyle = '#81d4fa'; ctx.lineWidth = 2.5; ctx.stroke()
    // Arrowhead
    const headLen = 6
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex - headLen * Math.cos(rad - 0.4), ey - headLen * Math.sin(rad - 0.4))
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex - headLen * Math.cos(rad + 0.4), ey - headLen * Math.sin(rad + 0.4))
    ctx.stroke()
    // "W" label
    ctx.fillStyle = '#81d4fa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('💨', cx, cy + 34)
  }

  // ── Input handlers ──
  function getCanvasPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const sx = CW / rect.width, sy = CH / rect.height
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: (touch.clientX - rect.left) * sx, y: (touch.clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    if (phase !== 'aiming') return
    e.preventDefault()
    const pos = getCanvasPos(e)
    if (distance(pos, ball.pos) < 80) {
      setIsDragging(true); setDragStart(pos); setDragEnd(pos)
    }
  }
  function handlePointerMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging) return; e.preventDefault(); setDragEnd(getCanvasPos(e))
  }
  function handlePointerUp(e: React.MouseEvent | React.TouchEvent) {
    if (!isDragging || !dragStart || !dragEnd) { setIsDragging(false); return }
    e.preventDefault()
    const pos = getCanvasPos(e)
    const dragDist = distance(dragStart, pos)
    if (dragDist > 12) {
      const dir = calculateDirection(ball.pos, pos)
      const power = calculatePower(dragDist)
      const vel = scale(dir, power)
      setBall(prev => ({ ...prev, vel }))
      ballRef.current = { ...ballRef.current, vel }
      setCurrentStrokes(s => s + 1)
      setTotalStrokes(s => s + 1)
      setPhase('rolling')
    }
    setIsDragging(false); setDragStart(null); setDragEnd(null)
  }

  // ── Game logic ──
  const handleHoleSunk = useCallback(() => {
    setPhase('sunk')
    setStrokes(prev => [...prev, currentStrokes])
    setTimeout(() => {
      const next = currentHoleIndex + 1
      if (next >= course.holes.length) handleGameComplete()
      else { setCurrentHoleIndex(next); resetHole(next); setPhase('aiming') }
    }, 2200)
  }, [currentHoleIndex, currentStrokes, course.holes.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleWaterReset() {
    setPhase('water-reset')
    setCurrentStrokes(s => s + 1)
    setTotalStrokes(s => s + 1)
    setTimeout(() => {
      const hole = course.holes[currentHoleIndex]
      setBall({ pos: { x: hole.ball.x * S, y: hole.ball.y * S }, vel: { x: 0, y: 0 }, inSand: false, inWater: false, sunk: false })
      setPhase('aiming')
    }, 1500)
  }

  async function handleGameComplete() {
    setPhase('submitting')
    if (timerRef.current) clearInterval(timerRef.current)
    // Golf scoring: par = perfect (100%), max strokes = worst (0%)
    // Uses squared ratio so bad play is punished harder
    const par = getTotalPar(course)
    const maxTotal = course.holes.length * config.maxStrokes
    const rawRatio = Math.max(0, Math.min(1, (maxTotal - totalStrokes) / (maxTotal - par)))
    const accuracy = rawRatio * rawRatio // squared: e.g. 0.8 raw → 0.64 displayed
    // Encode as correctAnswers/totalQuestions for the backend
    const correctAnswers = Math.round(accuracy * 100)
    const totalQuestions = 100
    try {
      const result = await completeGame({
        gameId, completionTime: timer, attempts: totalStrokes,
        correctAnswers, totalQuestions,
      })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setShowScoreModal(true); setPhase('complete')
    } catch { setPhase('complete'); setShowScoreModal(true) }
  }

  // Max strokes auto-advance
  useEffect(() => {
    if (currentStrokes >= config.maxStrokes && phase === 'aiming') {
      setStrokes(prev => [...prev, currentStrokes])
      const next = currentHoleIndex + 1
      if (next >= course.holes.length) handleGameComplete()
      else { setCurrentHoleIndex(next); resetHole(next) }
    }
  }, [currentStrokes, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const totalPar = getTotalPar(course)

  // Wind direction label
  const windDirLabel = (d: number) => {
    if (d >= 337.5 || d < 22.5) return '→'
    if (d >= 22.5 && d < 67.5) return '↘'
    if (d >= 67.5 && d < 112.5) return '↓'
    if (d >= 112.5 && d < 157.5) return '↙'
    if (d >= 157.5 && d < 202.5) return '←'
    if (d >= 202.5 && d < 247.5) return '↖'
    if (d >= 247.5 && d < 292.5) return '↑'
    return '↗'
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">⛳</div>
          <div className="text-green-200 text-xl font-bold animate-pulse">{t('miniGolf.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-slate-900 flex flex-col">
      {/* Sunk overlay */}
      {phase === 'sunk' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-7xl mb-2">🎉</div>
            <div className="text-white text-3xl font-black drop-shadow-lg">{getScoreName(currentStrokes, currentHole.par)}</div>
            <div className="text-green-300 text-lg font-bold">{currentStrokes} stroke{currentStrokes !== 1 ? 's' : ''} (Par {currentHole.par})</div>
          </div>
        </div>
      )}
      {phase === 'water-reset' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-center"><div className="text-6xl mb-2">💦</div>
          <div className="text-blue-200 text-xl font-bold">Water Hazard! +1 stroke</div></div>
        </div>
      )}

      {/* ── Top HUD ── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="text-sm text-green-100">
          <span className="font-mono font-bold">⏱ {formatTime(timer)}</span>
        </div>
        <div className="text-green-300 font-bold text-lg">
          Hole {currentHoleIndex + 1}/{course.holes.length}
        </div>
        <div className="text-sm text-green-100">
          Total: <span className="font-bold text-white">{totalStrokes}</span>
          <span className="text-green-400/70 text-xs ml-1">(Par {totalPar})</span>
        </div>
      </div>

      {/* Hole name */}
      {showHoleName && (
        <div className="absolute top-16 left-0 right-0 text-center z-30 pointer-events-none animate-fade-in">
          <div className="inline-block bg-green-900/90 rounded-xl px-6 py-3 border border-green-500/40">
            <div className="text-green-300 text-xl font-bold">{currentHole.name}</div>
            <div className="text-green-100/80 text-sm">Par {currentHole.par}</div>
          </div>
        </div>
      )}

      {/* ── Main content: Canvas + Environment Panel ── */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 px-3 py-2 min-h-0">
        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="rounded-2xl border-4 border-green-800 shadow-2xl w-full max-w-[min(90vw,750px)] aspect-square touch-none"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
          {/* Stroke counter on canvas */}
          <div className="absolute top-3 left-3 bg-green-900/80 rounded-lg px-3 py-1 border border-green-600/40">
            <span className="text-green-100 text-sm font-bold">{currentStrokes}/{config.maxStrokes}</span>
          </div>
        </div>

        {/* ── Environment Panel ── */}
        <div className="w-full lg:w-56 bg-green-900/60 backdrop-blur-sm rounded-2xl p-4 border border-green-700/40 shadow-lg">
          <h3 className="text-green-300 text-sm font-bold uppercase tracking-wider mb-3 text-center">
            ☁️ Conditions
          </h3>
          <div className="space-y-3">
            {/* Wind */}
            <div className="bg-green-800/40 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-200 text-xs font-medium">💨 Wind</span>
                <span className="text-white text-sm font-bold">{env.windSpeed} km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-400/80 text-xs">Direction</span>
                <span className="text-green-100 text-lg">{windDirLabel(env.windDirection)}</span>
              </div>
              <div className="mt-1.5 h-1.5 bg-green-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full"
                  style={{ width: `${(env.windSpeed / 20) * 100}%` }} />
              </div>
            </div>
            {/* Temperature */}
            <div className="bg-green-800/40 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-green-200 text-xs font-medium">🌡️ Temp</span>
                <span className="text-white text-sm font-bold">{env.temperature}°C</span>
              </div>
              <p className="text-green-400/70 text-[10px] mt-1">
                {env.temperature < 5 ? 'Frosty — ball rolls farther' : env.temperature > 35 ? 'Hot — grass is sticky' : 'Pleasant conditions'}
              </p>
            </div>
            {/* Altitude */}
            <div className="bg-green-800/40 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-green-200 text-xs font-medium">⛰️ Altitude</span>
                <span className="text-white text-sm font-bold">{env.altitude}m</span>
              </div>
              <p className="text-green-400/70 text-[10px] mt-1">
                {env.altitude > 1500 ? 'Thin air — less drag' : env.altitude > 500 ? 'Moderate elevation' : 'Sea level'}
              </p>
            </div>
          </div>
          {/* Tip */}
          <div className="mt-3 pt-3 border-t border-green-700/30">
            <p className="text-green-400/80 text-[10px] text-center italic">
              Conditions change each hole. Adjust your aim!
            </p>
          </div>
        </div>
      </div>

      {/* ── Power meter + hint ── */}
      {phase === 'aiming' && (
        <div className="text-center pb-2">
          <p className="text-green-400/80 text-xs">
            {isDragging ? '↕️ Pull back farther for more power' : '👆 Drag from the ball to aim & shoot'}
          </p>
          {isDragging && dragStart && dragEnd && (
            <div className="mt-1 inline-flex items-center gap-2 bg-green-900/60 rounded-full px-4 py-1">
              <span className="text-xs text-green-300">Power:</span>
              <div className="w-28 h-2.5 bg-green-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (calculatePower(distance(dragStart, dragEnd)) / PHYSICS.MAX_POWER) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Scorecard ── */}
      {strokes.length > 0 && phase !== 'sunk' && (
        <div className="px-4 pb-3">
          <div className="flex gap-1.5 justify-center flex-wrap">
            {strokes.map((s, i) => {
              const par = course.holes[i].par
              const diff = s - par
              const color = diff < 0 ? 'text-green-400' : diff === 0 ? 'text-white' : 'text-red-400'
              return (
                <div key={i} className="bg-green-900/60 rounded-lg px-2.5 py-1 text-center min-w-[36px] border border-green-800/40">
                  <div className="text-[9px] text-green-400/60">H{i + 1}</div>
                  <div className={`text-xs font-bold ${color}`}>{s}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ScoreBreakdownModal
        isOpen={showScoreModal}
        onClose={() => navigate(ROUTES.HUB)}
        scoreBreakdown={scoreBreakdown}
        leaderboardRank={leaderboardRank}
        onPlayAgain={() => navigate(ROUTES.MINI_GOLF_SETUP)}
        gameType="MINI_GOLF"
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  )
}
