import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import {
  type Car, type Intersection,
  DIFFICULTY_CONFIGS, generateIntersections, spawnCar,
  shouldCarStop, isBlockedByCar, checkIntersectionCrash,
  isCarOffScreen, ROAD_WIDTH,
} from '@/utils/trafficLabData'

type Difficulty = 'easy' | 'medium' | 'hard'
type GamePhase = 'loading' | 'playing' | 'gameover' | 'complete' | 'submitting'
const GRID_W = 500
const GRID_H = 400

export default function TrafficLabGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'easy'
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.easy

  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [intersections, setIntersections] = useState<Intersection[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [throughput, setThroughput] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(config.simulationTime)
  const [crashEffect, setCrashEffect] = useState<{x: number, y: number} | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const strikesRef = useRef(0)

  useEffect(() => {
    const init = async () => {
      try {
        const diffNum = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
        const result = await startGame({ themeId: 'TRAFFIC_LAB', difficulty: diffNum })
        if (!result.canPlay) { navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true }, replace: true }); return }
        setGameId(result.id)
        setIntersections(generateIntersections(config.intersections))
        setPhase('playing')
      } catch { navigate(ROUTES.TRAFFIC_LAB_SETUP, { replace: true }) }
    }
    init()
    return () => stopAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function stopAll() {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    if (spawnRef.current) clearInterval(spawnRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  // Game loop — move cars, check collisions
  useEffect(() => {
    if (phase !== 'playing') return
    gameLoopRef.current = setInterval(() => {
      setCars(prev => {
        let updated = prev.map(car => {
          if (car.crashed || car.passed) return car
          // Should stop at red light?
          if (shouldCarStop(car, intersections)) return car
          // Should stop for car ahead?
          if (isBlockedByCar(car, prev)) return car
          // Move
          const spd = car.speed * config.carSpeed
          let { x, y } = car
          switch (car.direction) {
            case 'north': y -= spd; break
            case 'south': y += spd; break
            case 'east': x += spd; break
            case 'west': x -= spd; break
          }
          const passed = isCarOffScreen({ ...car, x, y }, GRID_W, GRID_H)
          if (passed) setThroughput(t => t + 1)
          return { ...car, x, y, passed }
        })

        // Check for intersection crashes (perpendicular only)
        const crash = checkIntersectionCrash(updated, intersections)
        if (crash) {
          const [id1, id2] = crash
          const c1 = updated.find(c => c.id === id1)
          if (c1) setCrashEffect({ x: c1.x, y: c1.y })
          setTimeout(() => setCrashEffect(null), 1000)
          updated = updated.map(c => (c.id === id1 || c.id === id2) ? { ...c, crashed: true } : c)
          strikesRef.current += 1
          setStrikes(strikesRef.current)
          if (strikesRef.current >= 3) {
            setTimeout(() => handleGameOver(), 800)
          }
        }

        // Clean up old crashed/passed cars
        return updated.filter(c => !(c.passed) && !(c.crashed && Math.random() < 0.02))
      })
    }, 33)
    return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current) }
  }, [phase, intersections, config.carSpeed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Spawn cars
  useEffect(() => {
    if (phase !== 'playing') return
    spawnRef.current = setInterval(() => {
      setCars(prev => {
        if (prev.filter(c => !c.passed && !c.crashed).length >= config.maxCars) return prev
        return [...prev, spawnCar(intersections, GRID_W, GRID_H)]
      })
    }, config.spawnRate)
    return () => { if (spawnRef.current) clearInterval(spawnRef.current) }
  }, [phase, intersections, config]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { handleTimeUp(); return 0 } return t - 1 })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTimeUp() { stopAll(); setPhase('complete'); setTimeout(() => submitScore(), 500) }
  function handleGameOver() { stopAll(); setPhase('gameover'); setTimeout(() => submitScore(), 1000) }

  async function submitScore() {
    setPhase('submitting')
    try {
      const result = await completeGame({ gameId, completionTime: config.simulationTime - timeLeft, attempts: throughput + strikes * 5, correctAnswers: throughput, totalQuestions: throughput + strikes })
      setScoreBreakdown(result.scoreBreakdown); setLeaderboardRank(result.leaderboardRank); setShowScoreModal(true); setPhase('complete')
    } catch { setPhase('complete'); setShowScoreModal(true) }
  }

  function toggleLight(intId: string) {
    if (phase !== 'playing') return
    setIntersections(prev => prev.map(int => int.id !== intId ? int : { ...int, nsLight: int.nsLight === 'green' ? 'red' : 'green', ewLight: int.ewLight === 'green' ? 'red' : 'green' }))
  }

  if (phase === 'loading') {
    return (<div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4 animate-bounce">🚦</div><div className="text-amber-200 text-xl font-bold animate-pulse">Setting up traffic grid...</div></div></div>)
  }

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm">
        <div className="flex items-center gap-6">
          <div><span className="text-gray-400">🚗 Throughput: </span><span className="text-emerald-400 font-bold text-lg">{throughput}</span></div>
          <div><span className="text-gray-400">💥 Strikes: </span>
            {[0,1,2].map(i => <span key={i} className="text-lg">{i < strikes ? '💥' : '⭐'}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white font-mono font-bold text-lg">⏱ {timeLeft}s</span>
          <span className="text-amber-400 font-bold capitalize">{difficulty}</span>
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center py-1 text-xs text-slate-400 bg-gray-900/50">
        👆 Click the traffic light to toggle Green ↔ Red. Prevent perpendicular cars from crashing!
      </div>

      {/* Game grid */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="relative rounded-xl overflow-hidden border-2 border-gray-600" style={{ width: GRID_W, height: GRID_H, background: '#2d5a27' }}>
          {/* Roads */}
          {intersections.map(int => (
            <div key={`roads-${int.id}`}>
              {/* Vertical road */}
              <div className="absolute bg-gray-700" style={{ left: int.x - ROAD_WIDTH/2, top: 0, width: ROAD_WIDTH, height: GRID_H }} />
              {/* Horizontal road */}
              <div className="absolute bg-gray-700" style={{ left: 0, top: int.y - ROAD_WIDTH/2, width: GRID_W, height: ROAD_WIDTH }} />
              {/* Center line vertical */}
              <div className="absolute" style={{ left: int.x - 1, top: 0, width: 2, height: GRID_H, background: 'repeating-linear-gradient(to bottom, #eab308 0px, #eab308 10px, transparent 10px, transparent 20px)' }} />
              {/* Center line horizontal */}
              <div className="absolute" style={{ left: 0, top: int.y - 1, width: GRID_W, height: 2, background: 'repeating-linear-gradient(to right, #eab308 0px, #eab308 10px, transparent 10px, transparent 20px)' }} />
            </div>
          ))}

          {/* Traffic lights — clickable */}
          {intersections.map(int => (
            <button
              key={int.id}
              onClick={() => toggleLight(int.id)}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform active:scale-95"
              style={{ left: int.x, top: int.y }}
              title="Click to toggle traffic light"
            >
              {/* NS indicator */}
              <div className={`w-5 h-5 rounded-full border-2 border-white/50 ${int.nsLight === 'green' ? 'bg-green-500 shadow-green-500/50 shadow-lg' : 'bg-red-500 shadow-red-500/50 shadow-lg'}`} />
              <div className="text-[8px] text-white font-bold bg-gray-900/80 px-1 rounded">↕{int.nsLight === 'green' ? '🟢' : '🔴'} ↔{int.ewLight === 'green' ? '🟢' : '🔴'}</div>
              {/* EW indicator */}
              <div className={`w-5 h-5 rounded-full border-2 border-white/50 ${int.ewLight === 'green' ? 'bg-green-500 shadow-green-500/50 shadow-lg' : 'bg-red-500 shadow-red-500/50 shadow-lg'}`} />
            </button>
          ))}

          {/* Cars */}
          {cars.filter(c => !c.passed).map(car => {
            const isNS = car.direction === 'north' || car.direction === 'south'
            const rotation = car.direction === 'north' ? 0 : car.direction === 'south' ? 180 : car.direction === 'east' ? 90 : 270
            return (
              <div
                key={car.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-[33ms] ${car.crashed ? 'opacity-50' : ''}`}
                style={{ left: car.x, top: car.y }}
              >
                {/* Car shape */}
                <div className={`${isNS ? 'w-3 h-5' : 'w-5 h-3'} rounded-sm ${car.crashed ? 'bg-red-600' : isNS ? 'bg-blue-400' : 'bg-yellow-400'} border border-white/30 shadow-md`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>
            )
          })}

          {/* Crash effect */}
          {crashEffect && (
            <div className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 text-3xl animate-ping" style={{ left: crashEffect.x, top: crashEffect.y }}>
              💥
            </div>
          )}

          {/* Game over overlay */}
          {phase === 'gameover' && (
            <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center z-40">
              <div className="text-center"><div className="text-5xl mb-3">🚨</div><div className="text-red-100 text-2xl font-bold">System Shutdown!</div><div className="text-red-200 text-sm mt-1">3 crashes — simulation terminated</div></div>
            </div>
          )}

          {phase === 'complete' && !showScoreModal && (
            <div className="absolute inset-0 bg-emerald-900/70 flex items-center justify-center z-40">
              <div className="text-center"><div className="text-5xl mb-3">✅</div><div className="text-emerald-100 text-2xl font-bold">Simulation Complete!</div><div className="text-emerald-200 text-sm mt-1">{throughput} cars passed safely</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-2 flex justify-center gap-6 text-xs text-slate-400">
        <span><span className="inline-block w-3 h-3 bg-blue-400 rounded-sm mr-1" />N/S cars</span>
        <span><span className="inline-block w-3 h-3 bg-yellow-400 rounded-sm mr-1" />E/W cars</span>
        <span>🟢 = direction can go</span>
        <span>🔴 = direction must stop</span>
      </div>

      <ScoreBreakdownModal isOpen={showScoreModal} onClose={() => navigate(ROUTES.HUB)} scoreBreakdown={scoreBreakdown} leaderboardRank={leaderboardRank} onPlayAgain={() => navigate(ROUTES.TRAFFIC_LAB_SETUP)} gameType="TRAFFIC_LAB" />
    </div>
  )
}
