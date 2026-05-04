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
  generateBonusPuzzles,
} from '@/utils/spaceEntryPuzzles'
import type { MissionPuzzle } from '@/utils/spaceEntryPuzzles'

type GamePhase = 'loading' | 'setup' | 'reentry' | 'results' | 'submitting' | 'completed'

function latLngToGlobeXY(lat: number, lng: number, radius: number) {
  return { x: radius + (lng / 180) * radius, y: radius - (lat / 90) * radius }
}

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

  const difficulty = (searchParams.get('difficulty') as SpaceEntryDifficulty) || 'easy'
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.easy
  const difficultyNum = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3

  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [targetZone, setTargetZone] = useState<LandingZone | null>(null)
  const [countdown, setCountdown] = useState(config.countdownSeconds)
  const [attempts, setAttempts] = useState(1)
  const [finalResult, setFinalResult] = useState<LandingPrediction | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [animationClass, setAnimationClass] = useState('')

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

  const [bonusPuzzles, setBonusPuzzles] = useState<MissionPuzzle[]>([])
  const [bonusAnswers, setBonusAnswers] = useState<string[]>([])
  const [bonusSubmitted, setBonusSubmitted] = useState<boolean[]>([])
  const [bonusCorrect, setBonusCorrect] = useState<(boolean | null)[]>([])

  const controlPuzzleCount = 1 + (config.showThrusterPower ? 1 : 0) + (config.showLateralCorrection ? 1 : 0)
  const totalPuzzles = controlPuzzleCount + config.bonusPuzzleCount
  const controlSubmittedCount = (angleSubmitted ? 1 : 0) + (thrusterSubmitted ? 1 : 0) + (lateralSubmitted ? 1 : 0)
  const bonusSubmittedCount = bonusSubmitted.filter(Boolean).length
  const submittedCount = controlSubmittedCount + bonusSubmittedCount
  const allControlSubmitted = angleSubmitted && (!config.showThrusterPower || thrusterSubmitted) && (!config.showLateralCorrection || lateralSubmitted)
  const allBonusSubmitted = bonusSubmitted.length > 0 && bonusSubmitted.every(Boolean)
  const allSubmitted = allControlSubmitted && allBonusSubmitted
  const totalCorrect = (angleCorrect ? 1 : 0) + (thrusterCorrect ? 1 : 0) + (lateralCorrect ? 1 : 0) + bonusCorrect.filter((c) => c === true).length

  const resolvedAngle = angleSubmitted ? parseFloat(angleAnswer) || 0 : 0
  const resolvedThruster = thrusterSubmitted ? parseFloat(thrusterAnswer) || 50 : config.optimalThrusterPower
  const resolvedLateral = lateralSubmitted ? parseFloat(lateralAnswer) || 0 : 0

  const prediction: LandingPrediction | null = useMemo(() => {
    if (!targetZone) return null
    return predictLanding(targetZone.latitude, targetZone.longitude, resolvedAngle, resolvedThruster, resolvedLateral, config)
  }, [targetZone, resolvedAngle, resolvedThruster, resolvedLateral, config])

  const generateAllPuzzles = useCallback((zone: LandingZone) => {
    setAnglePuzzle(generateAnglePuzzle(difficulty))
    setThrusterPuzzle(config.showThrusterPower ? generateThrusterPuzzle(difficulty) : null)
    setLateralPuzzle(config.showLateralCorrection ? generateLateralPuzzle(difficulty, zone.longitude) : null)
    const bonus = generateBonusPuzzles(difficulty, config.bonusPuzzleCount)
    setBonusPuzzles(bonus)
    setBonusAnswers(new Array(bonus.length).fill(''))
    setBonusSubmitted(new Array(bonus.length).fill(false))
    setBonusCorrect(new Array(bonus.length).fill(null))
  }, [difficulty, config])

  useEffect(() => {
    const initGame = async () => {
      try {
        const game = await startGame({ themeId: 'SPACE_ENTRY', difficulty: difficultyNum })
        setGameId(game.id)
        const zone = getRandomLandingZone()
        setTargetZone(zone)
        generateAllPuzzles(zone)
        setPhase('setup')
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        } else { navigate(ROUTES.HUB) }
      }
    }
    initGame()
  }, [difficulty, difficultyNum, navigate, generateAllPuzzles])

  useEffect(() => {
    if (phase === 'setup') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => { if (prev <= 1) { handleInitiateReentry(); return 0 } return prev - 1 })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitAngle = () => { if (!anglePuzzle || angleSubmitted) return; const v = parseFloat(angleAnswer); if (isNaN(v)) return; setAngleSubmitted(true); setAngleCorrect(v === anglePuzzle.correctAnswer) }
  const handleSubmitThruster = () => { if (!thrusterPuzzle || thrusterSubmitted) return; const v = parseFloat(thrusterAnswer); if (isNaN(v)) return; setThrusterSubmitted(true); setThrusterCorrect(v === thrusterPuzzle.correctAnswer) }
  const handleSubmitLateral = () => { if (!lateralPuzzle || lateralSubmitted) return; const v = parseFloat(lateralAnswer); if (isNaN(v)) return; setLateralSubmitted(true); setLateralCorrect(v === lateralPuzzle.correctAnswer) }
  const handleSubmitBonus = (i: number) => { if (bonusSubmitted[i]) return; const v = parseFloat(bonusAnswers[i]); if (isNaN(v)) return; const ns = [...bonusSubmitted]; ns[i] = true; setBonusSubmitted(ns); const nc = [...bonusCorrect]; nc[i] = v === bonusPuzzles[i].correctAnswer; setBonusCorrect(nc) }
  const updateBonusAnswer = (i: number, val: string) => { const a = [...bonusAnswers]; a[i] = val; setBonusAnswers(a) }

  const handleInitiateReentry = useCallback(() => {
    if (phase !== 'setup' || !targetZone) return
    const turb = config.turbulenceRange > 0 ? (Math.random() * 2 - 1) * config.turbulenceRange : 0
    const angle = angleSubmitted ? parseFloat(angleAnswer) || 0 : 0
    const thruster = thrusterSubmitted ? parseFloat(thrusterAnswer) || 50 : config.optimalThrusterPower
    const lateral = lateralSubmitted ? parseFloat(lateralAnswer) || 0 : 0
    const result = predictLanding(targetZone.latitude, targetZone.longitude, angle, thruster, lateral, config, turb)
    setFinalResult(result); setPhase('reentry')
    if (result.outcome === 'SUCCESSFUL_LANDING') setAnimationClass('animate-landing')
    else if (result.outcome === 'ORBITAL_BURN_UP') setAnimationClass('animate-burnup')
    else setAnimationClass('animate-skipoff')
    setTimeout(() => { setPhase('results'); setAnimationClass('') }, 4000)
  }, [phase, targetZone, config, angleSubmitted, angleAnswer, thrusterSubmitted, thrusterAnswer, lateralSubmitted, lateralAnswer])

  const handleSeeScore = async () => {
    if (!finalResult || !gameId) return; setPhase('submitting')
    try {
      const result = await completeGame({ gameId, completionTime: Math.max(1, config.countdownSeconds - countdown), attempts, correctAnswers: totalCorrect, totalQuestions: totalPuzzles })
      if (result.scoreBreakdown) setScoreBreakdown(result.scoreBreakdown)
      if (result.leaderboardRank) setLeaderboardRank(result.leaderboardRank)
    } catch (e) { console.error('Failed to complete game:', e) } finally { setPhase('completed') }
  }

  const handleTryAgain = () => {
    setAttempts((p) => p + 1); setCountdown(config.countdownSeconds); setFinalResult(null)
    setAngleAnswer(''); setThrusterAnswer(''); setLateralAnswer('')
    setAngleSubmitted(false); setThrusterSubmitted(false); setLateralSubmitted(false)
    setAngleCorrect(null); setThrusterCorrect(null); setLateralCorrect(null)
    if (targetZone) generateAllPuzzles(targetZone); setPhase('setup')
  }

  const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}` }
  const shieldPct = prediction?.heatShieldRemaining ?? config.initialHeatShield
  const GLOBE_R = 120

  // ── early returns ─────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-green-400 font-mono text-2xl animate-pulse">INITIALIZING SYSTEMS...</div>
    </div>
  )
  if (phase === 'submitting') return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="border border-green-500/30 rounded-lg p-8 text-center bg-black/80">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4" />
        <div className="text-green-400 font-mono text-lg">{t('game.calculating')}</div>
      </div>
    </div>
  )
  if (phase === 'completed' && scoreBreakdown) return (
    <ScoreBreakdownModal isOpen onClose={() => navigate(ROUTES.SPACE_ENTRY_SETUP)} scoreBreakdown={scoreBreakdown} leaderboardRank={leaderboardRank} onPlayAgain={() => window.location.reload()} gameType="SPACE_ENTRY" />
  )

  /** Render a cockpit-style puzzle instrument */
  const renderInstrument = (
    puzzle: MissionPuzzle, answer: string, submitted: boolean, correct: boolean | null,
    onAnswerChange: (v: string) => void, onSubmit: () => void, inputId: string,
  ) => (
    <div key={inputId} className="bg-black/60 border border-green-500/20 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-green-400 font-mono text-xs uppercase tracking-wider">{puzzle.icon} {puzzle.label}</span>
        {submitted && (
          <span className={`font-mono text-xs ${correct ? 'text-green-400' : 'text-red-400'}`}>
            [{correct ? 'OK' : `ERR → ${puzzle.correctAnswer}${puzzle.unit}`}]
          </span>
        )}
      </div>
      <div className="bg-black/40 border border-green-500/10 rounded px-2 py-1.5">
        {puzzle.visual && <p className="text-green-600 font-mono text-[10px] mb-0.5">{puzzle.visual}</p>}
        <p className="text-green-300 font-mono text-xs">{puzzle.question}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={inputId} className="sr-only">{t('spaceEntry.yourAnswer')}</label>
        <span className="text-green-500 font-mono text-xs">&gt;</span>
        <input id={inputId} type="number" step="any" value={answer}
          onChange={(e) => onAnswerChange(e.target.value)} disabled={submitted || phase !== 'setup'}
          placeholder="___" className="flex-1 bg-transparent border-b border-green-500/30 text-green-300 font-mono text-sm px-1 py-0.5 placeholder-green-800 focus:outline-none focus:border-green-400 disabled:opacity-40"
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
          aria-label={`${puzzle.label} ${t('spaceEntry.yourAnswer')}`} />
        {puzzle.unit && <span className="text-green-600 font-mono text-xs">{puzzle.unit}</span>}
        <button onClick={onSubmit} disabled={submitted || !answer || phase !== 'setup'}
          className="bg-green-500/20 hover:bg-green-500/40 disabled:bg-transparent disabled:opacity-30 text-green-400 font-mono text-xs border border-green-500/30 rounded px-2 py-0.5 transition-colors"
          aria-label={t('spaceEntry.submit')}>
          ENTER
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden">
      {/* ── CSS ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes landing-descent { 0%{transform:translate(0,-60px) rotate(-30deg);opacity:1} 50%{transform:translate(0,-20px) rotate(-15deg);opacity:1} 100%{transform:translate(0,0) rotate(0deg);opacity:1} }
        @keyframes burnup-glow { 0%{transform:translate(0,-60px) rotate(-30deg);opacity:1;filter:brightness(1)} 50%{transform:translate(0,-20px) rotate(-15deg);opacity:1;filter:brightness(2.5) hue-rotate(40deg)} 100%{transform:translate(0,0);opacity:0;filter:brightness(4)} }
        @keyframes skipoff-bounce { 0%{transform:translate(0,-60px) rotate(-30deg);opacity:1} 40%{transform:translate(0,-20px) rotate(-15deg);opacity:1} 100%{transform:translate(80px,-100px) rotate(30deg);opacity:0} }
        .animate-landing{animation:landing-descent 4s ease-out forwards}
        .animate-burnup{animation:burnup-glow 3.5s ease-in forwards}
        .animate-skipoff{animation:skipoff-bounce 3.5s ease-out forwards}
        @keyframes pulse-dot{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1}50%{transform:translate(-50%,-50%) scale(1.5);opacity:.5}}
        .pulse-dot{animation:pulse-dot 2s ease-in-out infinite}
        @keyframes scanline{0%{top:-100%}100%{top:100%}}
        .cockpit-scanline::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,100,0.03) 2px,rgba(0,255,100,0.03) 4px);z-index:1}
      `}</style>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── WINDSHIELD: space view + globe + HUD ─────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative flex-shrink-0 h-[38vh] md:h-[42vh] bg-gradient-to-b from-black via-gray-950 to-gray-900 flex items-center justify-center overflow-hidden border-b-2 border-green-500/20">
        {/* stars */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: Math.random() > 0.8 ? 2 : 1, height: Math.random() > 0.8 ? 2 : 1,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.3 + Math.random() * 0.7,
            }} />
          ))}
        </div>

        {/* globe */}
        <div className="relative" style={{ width: GLOBE_R * 2, height: GLOBE_R * 2 }}>
          <div className="w-full h-full rounded-full overflow-hidden" style={{
            background: 'radial-gradient(circle at 40% 35%, #4fc3f7, #1565c0 50%, #0d47a1 80%, #1a237e)',
            boxShadow: '0 0 60px rgba(79,195,247,.25), inset 0 0 30px rgba(0,0,0,.4)',
          }}>
            <svg viewBox="0 0 256 256" className="w-full h-full opacity-25">
              <ellipse cx="135" cy="120" rx="18" ry="35" fill="#4caf50" />
              <ellipse cx="130" cy="75" rx="15" ry="12" fill="#4caf50" />
              <ellipse cx="175" cy="85" rx="30" ry="20" fill="#4caf50" />
              <ellipse cx="70" cy="80" rx="25" ry="18" fill="#4caf50" />
              <ellipse cx="85" cy="145" rx="14" ry="28" fill="#4caf50" />
              <ellipse cx="200" cy="155" rx="15" ry="10" fill="#4caf50" />
            </svg>
          </div>
          {/* target dot */}
          {targetZone && (() => { const p = latLngToGlobeXY(targetZone.latitude, targetZone.longitude, GLOBE_R); return (
            <div className="absolute pulse-dot" style={{ left: p.x, top: p.y, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444', border: '2px solid white', zIndex: 10 }} aria-label={`Target: ${targetZone.name}`} />
          ) })()}
          {/* predicted dot */}
          {prediction && targetZone && phase === 'setup' && controlSubmittedCount > 0 && (() => { const p = latLngToGlobeXY(prediction.predictedLat, prediction.predictedLng, GLOBE_R); return (
            <div className="absolute pulse-dot" style={{ left: p.x, top: p.y, width: 12, height: 12, borderRadius: '50%', backgroundColor: accuracyColor(prediction.accuracy), border: '2px solid white', zIndex: 15, boxShadow: `0 0 10px ${accuracyColor(prediction.accuracy)}` }}
              aria-label={`${t('spaceEntry.predictedLanding')}: ${prediction.predictedLat.toFixed(1)}°, ${prediction.predictedLng.toFixed(1)}°`} />
          ) })()}
          {/* spacecraft */}
          <div className={`absolute text-2xl ${animationClass}`} style={{ left: '50%', top: '8%', transform: 'translate(-50%,-50%) rotate(-30deg)', zIndex: 20 }}>
            {phase === 'reentry' && finalResult?.outcome === 'ORBITAL_BURN_UP' ? '🔥' : phase === 'results' && finalResult?.outcome === 'SUCCESSFUL_LANDING' ? '🪂' : phase === 'results' && finalResult?.outcome === 'ORBITAL_BURN_UP' ? '💥' : phase === 'results' && finalResult?.outcome === 'SKIP_OFF' ? '↗️' : '🚀'}
          </div>
        </div>

        {/* HUD overlay — top corners */}
        <div className="absolute top-3 left-4 flex flex-col gap-1">
          <span className="text-green-400 font-mono text-[10px] uppercase tracking-widest opacity-70">Mission Control</span>
          {targetZone && <span className="text-green-300 font-mono text-xs">TGT: {targetZone.name}</span>}
          {targetZone && <span className="text-green-600 font-mono text-[10px]">{targetZone.latitude.toFixed(1)}°{targetZone.latitude >= 0 ? 'N' : 'S'} {Math.abs(targetZone.longitude).toFixed(1)}°{targetZone.longitude >= 0 ? 'E' : 'W'}</span>}
        </div>
        <div className="absolute top-3 right-4 flex flex-col items-end gap-1">
          <span className={`font-mono text-lg tabular-nums ${countdown <= 10 ? 'text-red-400' : 'text-green-400'}`}>{fmt(countdown)}</span>
          <span className="text-green-500 font-mono text-[10px]">SHIELD {Math.round(shieldPct)}%</span>
          <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${shieldPct > 60 ? 'bg-green-500' : shieldPct > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${shieldPct}%` }} />
          </div>
        </div>
        {/* HUD bottom center — accuracy readout */}
        {prediction && controlSubmittedCount > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-4 text-green-400 font-mono text-xs">
            <span>DST: {prediction.distanceKm.toFixed(0)}km</span>
            <span>ACC: {Math.round(prediction.accuracy)}%</span>
          </div>
        )}
        {/* turbulence warning */}
        {difficulty === 'hard' && (
          <div className="absolute bottom-3 right-4 text-red-400 font-mono text-[10px] uppercase">⚠ Turbulence</div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── CONSOLE PANEL: cockpit computer screen ───────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 bg-gray-950 border-t border-green-500/10 relative cockpit-scanline overflow-hidden">
        <div className="h-full overflow-y-auto p-3 md:p-4 space-y-3">
          {/* status bar */}
          <div className="flex items-center justify-between">
            <span className="text-green-500 font-mono text-xs uppercase tracking-widest">
              ▸ Systems Check — {submittedCount}/{totalPuzzles} complete
            </span>
            <span className="text-green-600 font-mono text-xs">
              {allSubmitted ? '● READY' : '○ PENDING'}
            </span>
          </div>

          {/* ── instrument grid ──────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* FLIGHT CONTROLS */}
            <div className="space-y-2">
              <div className="text-green-500/60 font-mono text-[10px] uppercase tracking-widest border-b border-green-500/10 pb-1">
                ◆ Flight Controls
              </div>
              {anglePuzzle && renderInstrument(anglePuzzle, angleAnswer, angleSubmitted, angleCorrect, setAngleAnswer, handleSubmitAngle, 'angle-answer')}
              {thrusterPuzzle && renderInstrument(thrusterPuzzle, thrusterAnswer, thrusterSubmitted, thrusterCorrect, setThrusterAnswer, handleSubmitThruster, 'thruster-answer')}
              {lateralPuzzle && renderInstrument(lateralPuzzle, lateralAnswer, lateralSubmitted, lateralCorrect, setLateralAnswer, handleSubmitLateral, 'lateral-answer')}
            </div>

            {/* MISSION CHECKS */}
            {bonusPuzzles.length > 0 && (
              <div className="space-y-2">
                <div className="text-green-500/60 font-mono text-[10px] uppercase tracking-widest border-b border-green-500/10 pb-1">
                  ◆ Mission Checks ({bonusSubmittedCount}/{bonusPuzzles.length})
                </div>
                {bonusPuzzles.map((p, i) => renderInstrument(p, bonusAnswers[i], bonusSubmitted[i], bonusCorrect[i], (v) => updateBonusAnswer(i, v), () => handleSubmitBonus(i), `bonus-${i}`))}
              </div>
            )}
          </div>

          {/* auto-fire warning */}
          {countdown <= 10 && countdown > 0 && phase === 'setup' && (
            <div className="text-center text-red-400 font-mono text-sm animate-pulse">
              ⚠ AUTO-FIRE IN {countdown}s
            </div>
          )}

          {/* FIRE BUTTON */}
          {phase === 'setup' && (
            <button onClick={handleInitiateReentry} disabled={!allSubmitted}
              className={`w-full py-3 rounded-lg font-mono text-lg uppercase tracking-wider transition-all border-2 ${
                allSubmitted
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]'
                  : 'bg-gray-900 text-gray-600 border-gray-700 cursor-not-allowed'
              }`} aria-label={t('spaceEntry.initiateReentry')}>
              {allSubmitted ? '▶ INITIATE REENTRY' : `○ ${totalPuzzles - submittedCount} CHECKS REMAINING`}
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── RESULTS OVERLAY ──────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {phase === 'results' && finalResult && targetZone && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-950 border border-green-500/30 rounded-xl p-6 md:p-8 max-w-md w-full shadow-[0_0_40px_rgba(0,255,100,0.1)]">
            {finalResult.outcome === 'SUCCESSFUL_LANDING' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-2">✅</div>
                  <h2 className="text-2xl font-mono font-bold text-green-400 uppercase">Landing Successful</h2>
                </div>
                <div className="space-y-2 mb-6 font-mono text-sm">
                  <div className="flex justify-between text-green-300"><span>TGT</span><span>{targetZone.name}</span></div>
                  <div className="flex justify-between text-green-300"><span>ACC</span><span>{finalResult.accuracy.toFixed(1)}%</span></div>
                  <div className="flex justify-between text-green-300"><span>DST</span><span>{finalResult.distanceKm.toFixed(0)} km</span></div>
                  <div className="flex justify-between text-green-300"><span>SHD</span><span>{finalResult.heatShieldRemaining.toFixed(1)}%</span></div>
                  <div className="flex justify-between text-green-300"><span>CHK</span><span>{totalCorrect}/{totalPuzzles}</span></div>
                </div>
                <div className="bg-black/40 border border-green-500/10 rounded-lg p-3 mb-6">
                  <p className="text-green-600 font-mono text-[10px] uppercase mb-1">Intel Report</p>
                  <p className="text-green-300 font-mono text-xs">{targetZone.geographyFact}</p>
                </div>
                <button onClick={handleSeeScore} className="w-full py-3 rounded-lg font-mono text-lg uppercase bg-green-600 hover:bg-green-500 text-white border border-green-400 transition-all">
                  View Score ▸
                </button>
              </>
            )}
            {finalResult.outcome === 'ORBITAL_BURN_UP' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-2">💥</div>
                  <h2 className="text-2xl font-mono font-bold text-red-400 uppercase">Burn-Up</h2>
                  <p className="text-red-500/70 font-mono text-xs mt-1">{t('spaceEntry.burnUpMessage')}</p>
                </div>
                <div className="space-y-2 mb-6 font-mono text-sm">
                  <div className="flex justify-between text-red-300"><span>SHD</span><span>{finalResult.heatShieldRemaining.toFixed(1)}%</span></div>
                  <div className="flex justify-between text-red-300"><span>CHK</span><span>{totalCorrect}/{totalPuzzles}</span></div>
                </div>
                <button onClick={handleTryAgain} className="w-full py-3 rounded-lg font-mono text-lg uppercase bg-red-600/80 hover:bg-red-500 text-white border border-red-400/50 transition-all">
                  Retry Mission ▸
                </button>
              </>
            )}
            {finalResult.outcome === 'SKIP_OFF' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-2">↗️</div>
                  <h2 className="text-2xl font-mono font-bold text-yellow-400 uppercase">Skip-Off</h2>
                  <p className="text-yellow-500/70 font-mono text-xs mt-1">{t('spaceEntry.skipOffMessage')}</p>
                </div>
                <div className="space-y-2 mb-6 font-mono text-sm">
                  <div className="flex justify-between text-yellow-300"><span>ACC</span><span>{finalResult.accuracy.toFixed(1)}%</span></div>
                  <div className="flex justify-between text-yellow-300"><span>DST</span><span>{finalResult.distanceKm.toFixed(0)} km</span></div>
                  <div className="flex justify-between text-yellow-300"><span>CHK</span><span>{totalCorrect}/{totalPuzzles}</span></div>
                </div>
                <button onClick={handleTryAgain} className="w-full py-3 rounded-lg font-mono text-lg uppercase bg-yellow-600/80 hover:bg-yellow-500 text-white border border-yellow-400/50 transition-all">
                  Retry Mission ▸
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
