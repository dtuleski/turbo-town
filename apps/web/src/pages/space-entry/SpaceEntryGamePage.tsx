import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { DIFFICULTY_CONFIGS } from '@/utils/spaceEntryConfig'
import type { SpaceEntryDifficulty, DifficultyConfig } from '@/utils/spaceEntryConfig'
import { calculateTrajectory } from '@/utils/spaceEntryPhysics'
import type { TrajectoryResult } from '@/utils/spaceEntryPhysics'
import { getRandomLandingZone } from '@/utils/spaceEntryLandingZones'
import type { LandingZone } from '@/utils/spaceEntryLandingZones'

type GamePhase = 'loading' | 'setup' | 'reentry' | 'results' | 'submitting' | 'completed'

/** Convert lat/lng to x/y position on the circular globe */
function latLngToGlobeXY(lat: number, lng: number, radius: number): { x: number; y: number } {
  const x = radius + (lng / 180) * radius
  const y = radius - (lat / 90) * radius
  return { x, y }
}

/** Get trajectory arc color based on angle relative to config */
function getTrajectoryColor(angle: number, config: DifficultyConfig): string {
  if (!config.showTrajectoryColor) return '#a78bfa' // neutral purple
  const min = config.idealAngleMin - config.tolerance
  const max = config.idealAngleMax + config.tolerance
  if (angle >= config.idealAngleMin && angle <= config.idealAngleMax) return '#22c55e' // green
  if (angle >= min && angle <= max) return '#f59e0b' // orange
  return '#ef4444' // red
}

export default function SpaceEntryGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const difficulty = (searchParams.get('difficulty') as SpaceEntryDifficulty) || 'easy'
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.easy
  const difficultyNum = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3

  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [targetZone, setTargetZone] = useState<LandingZone | null>(null)
  const [entryAngle, setEntryAngle] = useState(() => Math.round(Math.random() * 900) / 10)
  const [heatShieldIntegrity, setHeatShieldIntegrity] = useState(config.initialHeatShield)
  const [countdown, setCountdown] = useState(config.countdownSeconds)
  const [attempts, setAttempts] = useState(1)
  const [trajectoryResult, setTrajectoryResult] = useState<TrajectoryResult | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [animationClass, setAnimationClass] = useState('')

  // Initialize game on mount
  useEffect(() => {
    const initGame = async () => {
      try {
        const game = await startGame({ themeId: 'SPACE_ENTRY', difficulty: difficultyNum })
        setGameId(game.id)
        setTargetZone(getRandomLandingZone())
        setHeatShieldIntegrity(config.initialHeatShield)
        setPhase('setup')
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else {
          console.error('Failed to start game:', error)
          navigate(ROUTES.HUB)
        }
      }
    }
    initGame()
  }, [difficulty, difficultyNum, config.initialHeatShield, navigate])

  // Countdown timer
  useEffect(() => {
    if (phase === 'setup') {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
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
  }, [phase])

  const handleInitiateReentry = useCallback(() => {
    if (phase !== 'setup' || !targetZone) return

    // Generate turbulence offset for hard mode
    const turbulenceOffset = config.turbulenceRange > 0
      ? (Math.random() * 2 - 1) * config.turbulenceRange
      : 0

    const result = calculateTrajectory(
      entryAngle,
      targetZone.atmosphericDensity,
      config,
      turbulenceOffset
    )

    setTrajectoryResult(result)
    setHeatShieldIntegrity(result.heatShieldRemaining)
    setPhase('reentry')

    // Set animation class based on outcome
    if (result.outcome === 'SUCCESSFUL_LANDING') setAnimationClass('animate-landing')
    else if (result.outcome === 'ORBITAL_BURN_UP') setAnimationClass('animate-burnup')
    else setAnimationClass('animate-skipoff')

    // After animation, show results
    setTimeout(() => {
      setPhase('results')
      setAnimationClass('')
    }, 4000)
  }, [phase, targetZone, entryAngle, config])

  const handleSeeScore = async () => {
    if (!trajectoryResult || !gameId) return
    setPhase('submitting')
    try {
      const result = await completeGame({
        gameId,
        completionTime: Math.max(1, config.countdownSeconds - countdown),
        attempts,
        correctAnswers: 1,
        totalQuestions: 1,
      })
      if (result.scoreBreakdown) setScoreBreakdown(result.scoreBreakdown)
      if (result.leaderboardRank) setLeaderboardRank(result.leaderboardRank)
    } catch (error) {
      console.error('Failed to complete game:', error)
    } finally {
      setPhase('completed')
    }
  }

  const handleTryAgain = () => {
    setAttempts(prev => prev + 1)
    setEntryAngle(Math.round(Math.random() * 900) / 10)
    setHeatShieldIntegrity(config.initialHeatShield)
    setCountdown(config.countdownSeconds)
    setTrajectoryResult(null)
    setPhase('setup')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const shieldColor = heatShieldIntegrity > 60 ? 'bg-green-500' : heatShieldIntegrity > 30 ? 'bg-yellow-500' : 'bg-red-500'
  const trajectoryColor = getTrajectoryColor(entryAngle, config)

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-4xl text-white font-bold animate-pulse">{t('common.loading')}</div>
      </div>
    )
  }

  // Submitting state
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <div className="text-2xl text-white font-bold">{t('game.calculating')}</div>
        </div>
      </div>
    )
  }

  // Completed — show ScoreBreakdownModal
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black py-4 px-4">
      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes landing-descent {
          0% { transform: translate(0, -60px) rotate(-30deg); opacity: 1; }
          50% { transform: translate(0, -20px) rotate(-15deg); opacity: 1; }
          80% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
        }
        @keyframes burnup-glow {
          0% { transform: translate(0, -60px) rotate(-30deg); opacity: 1; filter: brightness(1); }
          40% { transform: translate(0, -30px) rotate(-20deg); opacity: 1; filter: brightness(2) hue-rotate(30deg); }
          70% { transform: translate(0, -10px) rotate(-10deg); opacity: 0.8; filter: brightness(3) hue-rotate(60deg); }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 0; filter: brightness(4); }
        }
        @keyframes skipoff-bounce {
          0% { transform: translate(0, -60px) rotate(-30deg); opacity: 1; }
          40% { transform: translate(0, -20px) rotate(-15deg); opacity: 1; }
          60% { transform: translate(20px, -40px) rotate(10deg); opacity: 0.9; }
          100% { transform: translate(80px, -100px) rotate(30deg); opacity: 0; }
        }
        .animate-landing { animation: landing-descent 4s ease-out forwards; }
        .animate-burnup { animation: burnup-glow 3.5s ease-in forwards; }
        .animate-skipoff { animation: skipoff-bounce 3.5s ease-out forwards; }
        @keyframes pulse-target { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } }
        .pulse-target { animation: pulse-target 2s ease-in-out infinite; }
        @keyframes turbulence-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }
        .turbulence-shake { animation: turbulence-shake 0.3s ease-in-out infinite; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            🚀 {t('spaceEntry.missionControl')}
          </h1>
          <div className="flex items-center gap-4">
            <div className={`bg-white/10 rounded-xl px-4 py-2 font-mono ${countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              ⏱️ {t('spaceEntry.countdown')}: {formatTime(countdown)}
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-white">
              🔥 {Math.round(heatShieldIntegrity)}%
            </div>
          </div>
        </div>

        {/* Main Layout: Globe + Instruments */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Globe Visualization */}
          <div className="flex-shrink-0 flex justify-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              {/* Globe background */}
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{
                  background: 'radial-gradient(circle at 40% 35%, #4fc3f7, #1565c0 50%, #0d47a1 80%, #1a237e)',
                  boxShadow: '0 0 40px rgba(79, 195, 247, 0.3), inset 0 0 30px rgba(0,0,0,0.3)',
                }}
              >
                {/* Simplified continent shapes via SVG */}
                <svg viewBox="0 0 256 256" className="w-full h-full opacity-30">
                  {/* Africa */}
                  <ellipse cx="135" cy="120" rx="18" ry="35" fill="#4caf50" />
                  {/* Europe */}
                  <ellipse cx="130" cy="75" rx="15" ry="12" fill="#4caf50" />
                  {/* Asia */}
                  <ellipse cx="175" cy="85" rx="30" ry="20" fill="#4caf50" />
                  {/* North America */}
                  <ellipse cx="70" cy="80" rx="25" ry="18" fill="#4caf50" />
                  {/* South America */}
                  <ellipse cx="85" cy="145" rx="14" ry="28" fill="#4caf50" />
                  {/* Australia */}
                  <ellipse cx="200" cy="155" rx="15" ry="10" fill="#4caf50" />
                </svg>
              </div>

              {/* Target marker */}
              {targetZone && (() => {
                const r = 128
                const pos = latLngToGlobeXY(targetZone.latitude, targetZone.longitude, r)
                const scale = window.innerWidth >= 768 ? 160 / 128 : 1
                return (
                  <div
                    className="absolute pulse-target"
                    style={{
                      left: `${pos.x * scale}px`,
                      top: `${pos.y * scale}px`,
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      border: '2px solid white',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10,
                    }}
                    aria-label={`Target: ${targetZone.name}`}
                  />
                )
              })()}

              {/* Spacecraft icon */}
              <div
                className={`absolute text-2xl ${animationClass} ${phase === 'reentry' && trajectoryResult?.outcome === 'ORBITAL_BURN_UP' ? '' : ''}`}
                style={{
                  left: '50%',
                  top: '10%',
                  transform: 'translate(-50%, -50%) rotate(-30deg)',
                  zIndex: 20,
                }}
              >
                {phase === 'reentry' && trajectoryResult?.outcome === 'ORBITAL_BURN_UP' ? '🔥' :
                 phase === 'reentry' && trajectoryResult?.outcome === 'SKIP_OFF' ? '🚀' :
                 phase === 'results' && trajectoryResult?.outcome === 'SUCCESSFUL_LANDING' ? '🪂' :
                 phase === 'results' && trajectoryResult?.outcome === 'ORBITAL_BURN_UP' ? '💥' :
                 phase === 'results' && trajectoryResult?.outcome === 'SKIP_OFF' ? '↗️' :
                 '🚀'}
              </div>

              {/* Trajectory Arc SVG overlay */}
              {phase === 'setup' && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 256 256"
                >
                  <path
                    d={`M 128 20 Q ${128 + entryAngle} ${80 + entryAngle * 0.5} 128 230`}
                    fill="none"
                    stroke={trajectoryColor}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.8"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Right: Instrument Panel */}
          <div className="flex-1 space-y-4">
            {/* Target Info */}
            {targetZone && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">📍 {t('spaceEntry.target')}</h3>
                <p className="text-xl font-bold text-purple-200">{targetZone.name}</p>
                <p className="text-sm text-purple-300">
                  {targetZone.latitude.toFixed(2)}°, {targetZone.longitude.toFixed(2)}°
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-purple-500/30 rounded-full text-xs text-purple-200">
                  {targetZone.biome}
                </span>
              </div>
            )}

            {/* Entry Angle Slider */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <label htmlFor="entry-angle" className="text-lg font-bold text-white mb-2 block">
                📐 {t('spaceEntry.entryAngle')}: <span className="text-purple-300">{entryAngle.toFixed(1)}°</span>
              </label>
              <input
                id="entry-angle"
                type="range"
                min="0"
                max="90"
                step="0.1"
                value={entryAngle}
                onChange={(e) => setEntryAngle(parseFloat(e.target.value))}
                disabled={phase !== 'setup'}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-purple-500"
                aria-label={t('spaceEntry.entryAngle')}
                aria-valuemin={0}
                aria-valuemax={90}
                aria-valuenow={entryAngle}
              />
              <div className="flex justify-between text-xs text-purple-400 mt-1">
                <span>0°</span>
                <span>45°</span>
                <span>90°</span>
              </div>
              {config.showAngleHint && config.hintText && (
                <p className="mt-2 text-sm text-purple-300 bg-purple-500/20 rounded-lg px-3 py-1.5">
                  {t(config.hintText)}
                </p>
              )}
              {countdown <= 10 && countdown > 0 && phase === 'setup' && (
                <p className="mt-2 text-sm text-red-400 font-bold animate-pulse">
                  {t('spaceEntry.autoFire', { seconds: countdown })}
                </p>
              )}
            </div>

            {/* Atmospheric Density (Medium/Hard) */}
            {(difficulty === 'medium' || difficulty === 'hard') && targetZone && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <h3 className="text-lg font-bold text-white">
                  🌡️ {t('spaceEntry.atmosphericDensity')}
                </h3>
                <p className="text-2xl font-bold text-purple-200">{targetZone.atmosphericDensity.toFixed(1)}</p>
              </div>
            )}

            {/* Turbulence Warning (Hard only) */}
            {difficulty === 'hard' && (
              <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-4 border border-red-500/40 turbulence-shake">
                <p className="text-lg font-bold text-red-300">⚠️ {t('spaceEntry.turbulenceWarning')}</p>
              </div>
            )}

            {/* Initiate Reentry Button */}
            {phase === 'setup' && (
              <button
                onClick={handleInitiateReentry}
                className="w-full py-4 rounded-2xl text-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-xl"
                aria-label={t('spaceEntry.initiateReentry')}
              >
                {t('spaceEntry.initiateReentry')} 🚀
              </button>
            )}
          </div>
        </div>

        {/* Heat Shield Gauge */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-bold">🛡️ {t('spaceEntry.heatShield')}</span>
            <span className="text-white font-mono">{Math.round(heatShieldIntegrity)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${shieldColor}`}
              style={{ width: `${heatShieldIntegrity}%` }}
              role="progressbar"
              aria-valuenow={heatShieldIntegrity}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('spaceEntry.heatShield')}
            />
          </div>
        </div>

        {/* Results Overlay */}
        {phase === 'results' && trajectoryResult && targetZone && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
              {trajectoryResult.outcome === 'SUCCESSFUL_LANDING' && (
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-3">✅</div>
                    <h2 className="text-3xl font-bold text-green-400">{t('spaceEntry.successTitle')}</h2>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white">
                      <span>📍 {t('spaceEntry.target')}</span>
                      <span className="font-bold">{targetZone.name}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>🎯 {t('spaceEntry.landingAccuracy')}</span>
                      <span className="font-bold">{trajectoryResult.landingZoneAccuracy.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>🛡️ {t('spaceEntry.heatShield')} {t('spaceEntry.remaining')}</span>
                      <span className="font-bold">{trajectoryResult.heatShieldRemaining.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <h3 className="text-sm font-bold text-purple-300 mb-1">💡 {t('spaceEntry.geographyFact')}</h3>
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

              {trajectoryResult.outcome === 'ORBITAL_BURN_UP' && (
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-3">💥</div>
                    <h2 className="text-3xl font-bold text-red-400">{t('spaceEntry.burnUpTitle')}</h2>
                    <p className="text-red-300 mt-2">{t('spaceEntry.burnUpMessage')}</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white">
                      <span>🛡️ {t('spaceEntry.heatShieldAtFailure')}</span>
                      <span className="font-bold text-red-400">{trajectoryResult.heatShieldRemaining.toFixed(1)}%</span>
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

              {trajectoryResult.outcome === 'SKIP_OFF' && (
                <>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-3">↗️</div>
                    <h2 className="text-3xl font-bold text-yellow-400">{t('spaceEntry.skipOffTitle')}</h2>
                    <p className="text-yellow-300 mt-2">{t('spaceEntry.skipOffMessage')}</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white">
                      <span>📐 {t('spaceEntry.angleUsed')}</span>
                      <span className="font-bold text-yellow-400">{trajectoryResult.finalAngle.toFixed(1)}°</span>
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
    </div>
  )
}
