import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { DIFFICULTY_CONFIGS } from '@/utils/spaceEntryConfig'
import type { SpaceEntryDifficulty } from '@/utils/spaceEntryConfig'
import { predictLanding } from '@/utils/spaceEntryPhysics'
import type { LandingPrediction } from '@/utils/spaceEntryPhysics'
import { getRandomLandingZone } from '@/utils/spaceEntryLandingZones'
import type { LandingZone } from '@/utils/spaceEntryLandingZones'
import {
  generateAnglePuzzle,
  generateThrusterPuzzle,
  generateLateralPuzzle,
} from '@/utils/spaceEntryPuzzles'
import type { MissionPuzzle } from '@/utils/spaceEntryPuzzles'

type GamePhase = 'loading' | 'setup' | 'reentry' | 'results' | 'submitting' | 'completed'

/** Convert lat/lng to x/y on the circular globe visualisation */
function latLngToGlobeXY(
  lat: number,
  lng: number,
  radius: number,
): { x: number; y: number } {
  const x = radius + (lng / 180) * radius
  const y = radius - (lat / 90) * radius
  return { x, y }
}

/** Accuracy-based colour for the predicted-landing dot */
function accuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#22c55e'
  if (accuracy >= 50) return '#eab308'
  return '#f97316'
}

export default function SpaceEntryGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const difficulty =
    (searchParams.get('difficulty') as SpaceEntryDifficulty) || 'easy'
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.easy
  const difficultyNum = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3

  // ── core state ─────────────────────────────────────────────────────
  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [targetZone, setTargetZone] = useState<LandingZone | null>(null)
  const [countdown, setCountdown] = useState(config.countdownSeconds)
  const [attempts, setAttempts] = useState(1)
  const [finalResult, setFinalResult] = useState<LandingPrediction | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [animationClass, setAnimationClass] = useState('')

  // ── puzzle state ───────────────────────────────────────────────────
  const [anglePuzzle, setAnglePuzzle] = useState<MissionPuzzle | null>(null)
  const [thrusterPuzzle, setThrusterPuzzle] = useState<MissionPuzzle | null>(null)
  const [lateralPuzzle, setLateralPuzzle] = useState<MissionPuzzle | null>(null)

  const [angleAnswer, setAngleAnswer] = useState('')
  const [thrusterAnswer, setThrusterAnswer] = useState('')
  const [lateralAnswer, setLateralAnswer] = useState('')

  const [angleSubmitted, setAngleSubmitted] = useState(false)
  const [thrusterSubmitted, setThrusterSubmitted] = useState(false)
  const [lateralSubmitted, setLateralSubmitted] = useState(false)

  const [angleCorrect, setAngleCorrect] = useState<boolean | null>(null)
  const [thrusterCorrect, setThrusterCorrect] = useState<boolean | null>(null)
  const [lateralCorrect, setLateralCorrect] = useState<boolean | null>(null)

  // ── derived: how many puzzles required & how many submitted ────────
  const totalPuzzles = 1 + (config.showThrusterPower ? 1 : 0) + (config.showLateralCorrection ? 1 : 0)
  const submittedCount =
    (angleSubmitted ? 1 : 0) +
    (thrusterSubmitted ? 1 : 0) +
    (lateralSubmitted ? 1 : 0)
  const allSubmitted =
    angleSubmitted &&
    (!config.showThrusterPower || thrusterSubmitted) &&
    (!config.showLateralCorrection || lateralSubmitted)

  // ── resolved parameter values (player answers or defaults) ────────
  const resolvedAngle = angleSubmitted ? parseFloat(angleAnswer) || 0 : 0
  const resolvedThruster = thrusterSubmitted
    ? parseFloat(thrusterAnswer) || 50
    : config.optimalThrusterPower
  const resolvedLateral = lateralSubmitted ? parseFloat(lateralAnswer) || 0 : 0

  // ── live prediction (recalculated after each puzzle submission) ────
  const prediction: LandingPrediction | null = useMemo(() => {
    if (!targetZone) return null
    return predictLanding(
      targetZone.latitude,
      targetZone.longitude,
      resolvedAngle,
      resolvedThruster,
      resolvedLateral,
      config,
    )
  }, [targetZone, resolvedAngle, resolvedThruster, resolvedLateral, config])

  // ── generate puzzles helper ────────────────────────────────────────
  const generatePuzzles = useCallback(
    (zone: LandingZone) => {
      setAnglePuzzle(generateAnglePuzzle(difficulty))
      setThrusterPuzzle(config.showThrusterPower ? generateThrusterPuzzle(difficulty) : null)
      setLateralPuzzle(
        config.showLateralCorrection
          ? generateLateralPuzzle(difficulty, zone.longitude)
          : null,
      )
    },
    [difficulty, config],
  )

  // ── init game ─────────────────────────────────────────────────────
  useEffect(() => {
    const initGame = async () => {
      try {
        const game = await startGame({ themeId: 'SPACE_ENTRY', difficulty: difficultyNum })
        setGameId(game.id)
        const zone = getRandomLandingZone()
        setTargetZone(zone)
        generatePuzzles(zone)
        setPhase('setup')
      } catch (error: any) {
        if (
          error?.message?.includes('Rate limit') ||
          error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED'
        ) {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else {
          console.error('Failed to start game:', error)
          navigate(ROUTES.HUB)
        }
      }
    }
    initGame()
  }, [difficulty, difficultyNum, navigate, generatePuzzles])

  // ── countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'setup') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleInitiateReentry()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── puzzle submission handlers ─────────────────────────────────────
  const handleSubmitAngle = () => {
    if (!anglePuzzle || angleSubmitted) return
    const val = parseFloat(angleAnswer)
    if (isNaN(val)) return
    setAngleSubmitted(true)
    setAngleCorrect(val === anglePuzzle.correctAnswer)
  }

  const handleSubmitThruster = () => {
    if (!thrusterPuzzle || thrusterSubmitted) return
    const val = parseFloat(thrusterAnswer)
    if (isNaN(val)) return
    setThrusterSubmitted(true)
    setThrusterCorrect(val === thrusterPuzzle.correctAnswer)
  }

  const handleSubmitLateral = () => {
    if (!lateralPuzzle || lateralSubmitted) return
    const val = parseFloat(lateralAnswer)
    if (isNaN(val)) return
    setLateralSubmitted(true)
    setLateralCorrect(val === lateralPuzzle.correctAnswer)
  }

  // ── fire ──────────────────────────────────────────────────────────
  const handleInitiateReentry = useCallback(() => {
    if (phase !== 'setup' || !targetZone) return

    const turbulenceOffset =
      config.turbulenceRange > 0
        ? (Math.random() * 2 - 1) * config.turbulenceRange
        : 0

    // Use player's submitted answers as parameter values
    const angle = angleSubmitted ? parseFloat(angleAnswer) || 0 : 0
    const thruster = thrusterSubmitted
      ? parseFloat(thrusterAnswer) || 50
      : config.optimalThrusterPower
    const lateral = lateralSubmitted ? parseFloat(lateralAnswer) || 0 : 0

    const result = predictLanding(
      targetZone.latitude,
      targetZone.longitude,
      angle,
      thruster,
      lateral,
      config,
      turbulenceOffset,
    )

    setFinalResult(result)
    setPhase('reentry')

    if (result.outcome === 'SUCCESSFUL_LANDING') setAnimationClass('animate-landing')
    else if (result.outcome === 'ORBITAL_BURN_UP') setAnimationClass('animate-burnup')
    else setAnimationClass('animate-skipoff')

    setTimeout(() => {
      setPhase('results')
      setAnimationClass('')
    }, 4000)
  }, [
    phase, targetZone, config,
    angleSubmitted, angleAnswer,
    thrusterSubmitted, thrusterAnswer,
    lateralSubmitted, lateralAnswer,
  ])

  // ── score submission ──────────────────────────────────────────────
  const handleSeeScore = async () => {
    if (!finalResult || !gameId) return
    setPhase('submitting')

    const correctCount =
      (angleCorrect ? 1 : 0) +
      (thrusterCorrect ? 1 : 0) +
      (lateralCorrect ? 1 : 0)

    try {
      const result = await completeGame({
        gameId,
        completionTime: Math.max(1, config.countdownSeconds - countdown),
        attempts,
        correctAnswers: correctCount,
        totalQuestions: totalPuzzles,
      })
      if (result.scoreBreakdown) setScoreBreakdown(result.scoreBreakdown)
      if (result.leaderboardRank) setLeaderboardRank(result.leaderboardRank)
    } catch (error) {
      console.error('Failed to complete game:', error)
    } finally {
      setPhase('completed')
    }
  }

  // ── retry ─────────────────────────────────────────────────────────
  const handleTryAgain = () => {
    setAttempts((prev) => prev + 1)
    setCountdown(config.countdownSeconds)
    setFinalResult(null)

    // Reset puzzle answers
    setAngleAnswer('')
    setThrusterAnswer('')
    setLateralAnswer('')
    setAngleSubmitted(false)
    setThrusterSubmitted(false)
    setLateralSubmitted(false)
    setAngleCorrect(null)
    setThrusterCorrect(null)
    setLateralCorrect(null)

    // Generate new puzzles
    if (targetZone) generatePuzzles(targetZone)
    setPhase('setup')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const shieldPct = prediction?.heatShieldRemaining ?? config.initialHeatShield
  const shieldColor =
    shieldPct > 60 ? 'bg-green-500' : shieldPct > 30 ? 'bg-yellow-500' : 'bg-red-500'

  // ── loading / submitting / completed states ───────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-4xl text-white font-bold animate-pulse">
          {t('common.loading')}
        </div>
      </div>
    )
  }

  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4" />
          <div className="text-2xl text-white font-bold">{t('game.calculating')}</div>
        </div>
      </div>
    )
  }

  if (phase === 'completed' && scoreBreakdown) {
    return (
      <ScoreBreakdownModal
        isOpen={true}
        onClose={() => navigate(ROUTES.SPACE_ENTRY_SETUP)}
        scoreBreakdown={scoreBreakdown}
        leaderboardRank={leaderboardRank}
        onPlayAgain={() => window.location.reload()}
        gameType="SPACE_ENTRY"
      />
    )
  }

  const GLOBE_R = 144

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-3 md:p-4 flex flex-col">
      {/* ── CSS keyframes ─────────────────────────────────────────── */}
      <style>{`
        @keyframes landing-descent {
          0%   { transform: translate(0,-60px) rotate(-30deg); opacity:1; }
          50%  { transform: translate(0,-20px) rotate(-15deg); opacity:1; }
          80%  { transform: translate(0,0) rotate(0deg); opacity:1; }
          100% { transform: translate(0,0) rotate(0deg); opacity:1; }
        }
        @keyframes burnup-glow {
          0%   { transform: translate(0,-60px) rotate(-30deg); opacity:1; filter:brightness(1); }
          40%  { transform: translate(0,-30px) rotate(-20deg); opacity:1; filter:brightness(2) hue-rotate(30deg); }
          70%  { transform: translate(0,-10px) rotate(-10deg); opacity:.8; filter:brightness(3) hue-rotate(60deg); }
          100% { transform: translate(0,0) rotate(0deg); opacity:0; filter:brightness(4); }
        }
        @keyframes skipoff-bounce {
          0%   { transform: translate(0,-60px) rotate(-30deg); opacity:1; }
          40%  { transform: translate(0,-20px) rotate(-15deg); opacity:1; }
          60%  { transform: translate(20px,-40px) rotate(10deg); opacity:.9; }
          100% { transform: translate(80px,-100px) rotate(30deg); opacity:0; }
        }
        .animate-landing { animation: landing-descent 4s ease-out forwards; }
        .animate-burnup  { animation: burnup-glow 3.5s ease-in forwards; }
        .animate-skipoff  { animation: skipoff-bounce 3.5s ease-out forwards; }
        @keyframes pulse-dot { 0%,100% { transform:translate(-50%,-50%) scale(1); opacity:1; } 50% { transform:translate(-50%,-50%) scale(1.6); opacity:.55; } }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes turbulence-shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-2px); } 75% { transform:translateX(2px); } }
        .turbulence-shake { animation: turbulence-shake .3s ease-in-out infinite; }
      `}</style>

      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1">
        {/* ── HEADER BAR ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            🚀 {t('spaceEntry.missionControl')}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`bg-white/10 rounded-lg px-3 py-1.5 font-mono ${
                countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}
            >
              ⏱️ {formatTime(countdown)}
            </span>
            <span className="bg-white/10 rounded-lg px-3 py-1.5 text-white font-mono">
              🔥 {Math.round(shieldPct)}%
            </span>
          </div>
        </div>

        {/* ── MAIN: Globe (left) + Puzzles (right) ────────────────── */}
        <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
          {/* ── GLOBE ─────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex justify-center items-start">
            <div className="relative w-72 h-72 md:w-80 md:h-80">
              {/* ocean + atmosphere */}
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle at 40% 35%, #4fc3f7, #1565c0 50%, #0d47a1 80%, #1a237e)',
                  boxShadow:
                    '0 0 40px rgba(79,195,247,.3), inset 0 0 30px rgba(0,0,0,.3)',
                }}
              >
                <svg viewBox="0 0 256 256" className="w-full h-full opacity-30">
                  <ellipse cx="135" cy="120" rx="18" ry="35" fill="#4caf50" />
                  <ellipse cx="130" cy="75" rx="15" ry="12" fill="#4caf50" />
                  <ellipse cx="175" cy="85" rx="30" ry="20" fill="#4caf50" />
                  <ellipse cx="70" cy="80" rx="25" ry="18" fill="#4caf50" />
                  <ellipse cx="85" cy="145" rx="14" ry="28" fill="#4caf50" />
                  <ellipse cx="200" cy="155" rx="15" ry="10" fill="#4caf50" />
                </svg>
              </div>

              {/* target (red) dot */}
              {targetZone && (() => {
                const r = GLOBE_R
                const pos = latLngToGlobeXY(targetZone.latitude, targetZone.longitude, r)
                return (
                  <div
                    className="absolute pulse-dot"
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      border: '2px solid white',
                      zIndex: 10,
                    }}
                    aria-label={`Target: ${targetZone.name}`}
                  />
                )
              })()}

              {/* predicted landing (green/yellow/orange) dot — shown after at least one puzzle submitted */}
              {prediction && targetZone && phase === 'setup' && submittedCount > 0 && (() => {
                const r = GLOBE_R
                const pos = latLngToGlobeXY(prediction.predictedLat, prediction.predictedLng, r)
                return (
                  <div
                    className="absolute pulse-dot"
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: accuracyColor(prediction.accuracy),
                      border: '2px solid white',
                      zIndex: 15,
                      boxShadow: `0 0 8px ${accuracyColor(prediction.accuracy)}`,
                    }}
                    aria-label={`${t('spaceEntry.predictedLanding')}: ${prediction.predictedLat.toFixed(1)}°, ${prediction.predictedLng.toFixed(1)}°`}
                  />
                )
              })()}

              {/* spacecraft icon */}
              <div
                className={`absolute text-2xl ${animationClass}`}
                style={{ left: '50%', top: '10%', transform: 'translate(-50%,-50%) rotate(-30deg)', zIndex: 20 }}
              >
                {phase === 'reentry' && finalResult?.outcome === 'ORBITAL_BURN_UP'
                  ? '🔥'
                  : phase === 'results' && finalResult?.outcome === 'SUCCESSFUL_LANDING'
                    ? '🪂'
                    : phase === 'results' && finalResult?.outcome === 'ORBITAL_BURN_UP'
                      ? '💥'
                      : phase === 'results' && finalResult?.outcome === 'SKIP_OFF'
                        ? '↗️'
                        : '🚀'}
              </div>
            </div>
          </div>

          {/* ── PUZZLE PANEL (right) ──────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* target info */}
            {targetZone && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-white font-bold">📍 {t('spaceEntry.target')}:</span>
                  <span className="text-purple-200 font-bold">{targetZone.name}</span>
                  <span className="text-purple-400 text-sm">
                    {targetZone.latitude.toFixed(1)}°{targetZone.latitude >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(targetZone.longitude).toFixed(1)}°{targetZone.longitude >= 0 ? 'E' : 'W'}
                  </span>
                </div>
              </div>
            )}

            {/* puzzle cards container */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-4">
              {/* ── ANGLE PUZZLE ──────────────────────────────────── */}
              {anglePuzzle && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white font-medium">
                    <span>📐</span>
                    <span>{t('spaceEntry.entryAngle')}</span>
                    {angleSubmitted && (
                      <span className={`ml-auto text-xs font-bold ${angleCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {angleCorrect
                          ? t('spaceEntry.correctAnswer')
                          : t('spaceEntry.wrongAnswer', { answer: anglePuzzle.correctAnswer + anglePuzzle.unit })}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    {anglePuzzle.visual && (
                      <p className="text-xs text-purple-300 mb-1">{anglePuzzle.visual}</p>
                    )}
                    <p className="text-white text-sm">{anglePuzzle.question}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="angle-answer" className="sr-only">{t('spaceEntry.yourAnswer')}</label>
                    <input
                      id="angle-answer"
                      type="number"
                      step="any"
                      value={angleAnswer}
                      onChange={(e) => setAngleAnswer(e.target.value)}
                      disabled={angleSubmitted || phase !== 'setup'}
                      placeholder={t('spaceEntry.yourAnswer')}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitAngle() }}
                      aria-label={`${t('spaceEntry.entryAngle')} ${t('spaceEntry.yourAnswer')}`}
                    />
                    <span className="text-white text-sm">{anglePuzzle.unit}</span>
                    <button
                      onClick={handleSubmitAngle}
                      disabled={angleSubmitted || !angleAnswer || phase !== 'setup'}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-bold transition-colors"
                      aria-label={t('spaceEntry.submit')}
                    >
                      ✅
                    </button>
                  </div>
                </div>
              )}

              {/* ── THRUSTER PUZZLE (medium/hard) ─────────────────── */}
              {thrusterPuzzle && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white font-medium">
                    <span>🔥</span>
                    <span>{t('spaceEntry.thrusterPower')}</span>
                    {thrusterSubmitted && (
                      <span className={`ml-auto text-xs font-bold ${thrusterCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {thrusterCorrect
                          ? t('spaceEntry.correctAnswer')
                          : t('spaceEntry.wrongAnswer', { answer: thrusterPuzzle.correctAnswer + thrusterPuzzle.unit })}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    {thrusterPuzzle.visual && (
                      <p className="text-xs text-orange-300 mb-1">{thrusterPuzzle.visual}</p>
                    )}
                    <p className="text-white text-sm">{thrusterPuzzle.question}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="thruster-answer" className="sr-only">{t('spaceEntry.yourAnswer')}</label>
                    <input
                      id="thruster-answer"
                      type="number"
                      step="any"
                      value={thrusterAnswer}
                      onChange={(e) => setThrusterAnswer(e.target.value)}
                      disabled={thrusterSubmitted || phase !== 'setup'}
                      placeholder={t('spaceEntry.yourAnswer')}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-orange-300/50 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitThruster() }}
                      aria-label={`${t('spaceEntry.thrusterPower')} ${t('spaceEntry.yourAnswer')}`}
                    />
                    <span className="text-white text-sm">{thrusterPuzzle.unit}</span>
                    <button
                      onClick={handleSubmitThruster}
                      disabled={thrusterSubmitted || !thrusterAnswer || phase !== 'setup'}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-bold transition-colors"
                      aria-label={t('spaceEntry.submit')}
                    >
                      ✅
                    </button>
                  </div>
                </div>
              )}

              {/* ── LATERAL PUZZLE (hard only) ────────────────────── */}
              {lateralPuzzle && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white font-medium">
                    <span>↔️</span>
                    <span>{t('spaceEntry.lateralCorrection')}</span>
                    {lateralSubmitted && (
                      <span className={`ml-auto text-xs font-bold ${lateralCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {lateralCorrect
                          ? t('spaceEntry.correctAnswer')
                          : t('spaceEntry.wrongAnswer', { answer: lateralPuzzle.correctAnswer + lateralPuzzle.unit })}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    {lateralPuzzle.visual && (
                      <p className="text-xs text-cyan-300 mb-1">{lateralPuzzle.visual}</p>
                    )}
                    <p className="text-white text-sm">{lateralPuzzle.question}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="lateral-answer" className="sr-only">{t('spaceEntry.yourAnswer')}</label>
                    <input
                      id="lateral-answer"
                      type="number"
                      step="any"
                      value={lateralAnswer}
                      onChange={(e) => setLateralAnswer(e.target.value)}
                      disabled={lateralSubmitted || phase !== 'setup'}
                      placeholder={t('spaceEntry.yourAnswer')}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitLateral() }}
                      aria-label={`${t('spaceEntry.lateralCorrection')} ${t('spaceEntry.yourAnswer')}`}
                    />
                    <span className="text-white text-sm">{lateralPuzzle.unit}</span>
                    <button
                      onClick={handleSubmitLateral}
                      disabled={lateralSubmitted || !lateralAnswer || phase !== 'setup'}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm font-bold transition-colors"
                      aria-label={t('spaceEntry.submit')}
                    >
                      ✅
                    </button>
                  </div>
                </div>
              )}

              {/* puzzle progress */}
              <div className="text-xs text-purple-300 pt-2 border-t border-white/10">
                {allSubmitted
                  ? `✅ ${t('spaceEntry.allPuzzlesSolved')}`
                  : `🧮 ${t('spaceEntry.puzzlesRemaining', { count: totalPuzzles - submittedCount })}`}
              </div>

              {/* live distance readout (after at least one puzzle submitted) */}
              {prediction && submittedCount > 0 && (
                <div className="flex items-center gap-4 text-xs text-purple-300 pt-1 border-t border-white/10">
                  <span>
                    {t('spaceEntry.distanceFromTarget')}: <strong className="text-white">{prediction.distanceKm.toFixed(0)} km</strong>
                  </span>
                  <span>
                    {t('spaceEntry.accuracy')}: <strong className="text-white">{Math.round(prediction.accuracy)}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* turbulence warning */}
            {difficulty === 'hard' && (
              <div className="bg-red-500/20 rounded-xl px-4 py-2 border border-red-500/40 turbulence-shake">
                <p className="text-sm font-bold text-red-300">⚠️ {t('spaceEntry.turbulenceWarning')}</p>
              </div>
            )}

            {/* auto-fire warning */}
            {countdown <= 10 && countdown > 0 && phase === 'setup' && (
              <p className="text-sm text-red-400 font-bold animate-pulse text-center">
                {t('spaceEntry.autoFire', { seconds: countdown })}
              </p>
            )}

            {/* FIRE button — disabled until all puzzles submitted */}
            {phase === 'setup' && (
              <button
                onClick={handleInitiateReentry}
                disabled={!allSubmitted}
                className={`w-full py-3 rounded-xl text-lg font-bold transition-all duration-300 transform shadow-xl ${
                  allSubmitted
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:scale-[1.03]'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                aria-label={t('spaceEntry.initiateReentry')}
              >
                🚀 {t('spaceEntry.initiateReentry')}
              </button>
            )}
          </div>
        </div>

        {/* ── HEAT SHIELD BAR (bottom) ────────────────────────────── */}
        <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white text-sm font-bold">🛡️ {t('spaceEntry.heatShield')}</span>
            <span className="text-white text-sm font-mono">{Math.round(shieldPct)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${shieldColor}`}
              style={{ width: `${shieldPct}%` }}
              role="progressbar"
              aria-valuenow={shieldPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('spaceEntry.heatShield')}
            />
          </div>
        </div>
      </div>

      {/* ── RESULTS OVERLAY ───────────────────────────────────────── */}
      {phase === 'results' && finalResult && targetZone && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            {finalResult.outcome === 'SUCCESSFUL_LANDING' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">✅</div>
                  <h2 className="text-3xl font-bold text-green-400">
                    {t('spaceEntry.successTitle')}
                  </h2>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-white">
                    <span>📍 {t('spaceEntry.target')}</span>
                    <span className="font-bold">{targetZone.name}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>🎯 {t('spaceEntry.accuracy')}</span>
                    <span className="font-bold">{finalResult.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>📏 {t('spaceEntry.distanceFromTarget')}</span>
                    <span className="font-bold">{finalResult.distanceKm.toFixed(0)} km</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>🛡️ {t('spaceEntry.heatShield')}</span>
                    <span className="font-bold">{finalResult.heatShieldRemaining.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-bold text-purple-300 mb-1">
                    💡 {t('spaceEntry.geographyFact')}
                  </h3>
                  <p className="text-white text-sm">{targetZone.geographyFact}</p>
                </div>
                <button
                  onClick={handleSeeScore}
                  className="w-full py-3 rounded-xl text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  {t('spaceEntry.seeScore')} 🏆
                </button>
              </>
            )}

            {finalResult.outcome === 'ORBITAL_BURN_UP' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">💥</div>
                  <h2 className="text-3xl font-bold text-red-400">
                    {t('spaceEntry.burnUpTitle')}
                  </h2>
                  <p className="text-red-300 mt-2">{t('spaceEntry.burnUpMessage')}</p>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-white">
                    <span>🛡️ {t('spaceEntry.heatShieldAtFailure')}</span>
                    <span className="font-bold text-red-400">
                      {finalResult.heatShieldRemaining.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 rounded-xl text-lg font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all"
                >
                  {t('spaceEntry.tryAgain')} 🔄
                </button>
              </>
            )}

            {finalResult.outcome === 'SKIP_OFF' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">↗️</div>
                  <h2 className="text-3xl font-bold text-yellow-400">
                    {t('spaceEntry.skipOffTitle')}
                  </h2>
                  <p className="text-yellow-300 mt-2">{t('spaceEntry.skipOffMessage')}</p>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-white">
                    <span>🎯 {t('spaceEntry.accuracy')}</span>
                    <span className="font-bold text-yellow-400">
                      {finalResult.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>📏 {t('spaceEntry.distanceFromTarget')}</span>
                    <span className="font-bold text-yellow-400">
                      {finalResult.distanceKm.toFixed(0)} km
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 rounded-xl text-lg font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all"
                >
                  {t('spaceEntry.tryAgain')} 🔄
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
