import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import {
  type Difficulty,
  type Recipe,
  calculateHeat,
  calculateRecipeScore,
  calculateFinalScore,
  canPlaceElement,
  difficultyToNumber,
  checkRecipeComplete,
  selectRecipes,
  DIFFICULTY_CONFIGS,
  ELEMENTS,
} from '@/utils/bondAndBurnLogic'

const COMPOUND_VISUALS: Record<string, { emoji: string; color: string }> = {
  water: { emoji: '💧', color: 'from-blue-400 to-cyan-400' },
  salt: { emoji: '🧂', color: 'from-purple-400 to-pink-400' },
  co2: { emoji: '💨', color: 'from-gray-400 to-slate-500' },
  methane: { emoji: '🔥', color: 'from-orange-400 to-red-400' },
  ammonia: { emoji: '🧪', color: 'from-green-400 to-emerald-500' },
  ethane: { emoji: '⛽', color: 'from-amber-400 to-orange-500' },
  'hydrogen-peroxide': { emoji: '🫧', color: 'from-sky-300 to-blue-400' },
  'hydrochloric-acid': { emoji: '⚗️', color: 'from-yellow-400 to-lime-500' },
  'sodium-hydroxide': { emoji: '🧴', color: 'from-violet-400 to-purple-500' },
  'nitrous-oxide': { emoji: '😂', color: 'from-teal-300 to-cyan-500' },
}

type GamePhase = 'loading' | 'playing' | 'reacting' | 'meltdown' | 'complete' | 'submitting'

export default function BondAndBurnGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'easy'
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.easy

  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0)
  const [beaker, setBeaker] = useState<string[]>([])
  const [heatLevel, setHeatLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(1)
  const [timer, setTimer] = useState(0)
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [recipeStartTime, setRecipeStartTime] = useState(0)
  const [showFunFact, setShowFunFact] = useState('')
  const [shakeScreen, setShakeScreen] = useState(false)
  const [wrongPick, setWrongPick] = useState('')
  const [reactionAnimation, setReactionAnimation] = useState(false)
  const [draggingElement, setDraggingElement] = useState<string | null>(null)
  const [flaskHover, setFlaskHover] = useState(false)

  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [showScoreModal, setShowScoreModal] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flaskRef = useRef<HTMLDivElement>(null)

  const currentRecipe = recipes[currentRecipeIndex]
  const compoundVisual = currentRecipe ? COMPOUND_VISUALS[currentRecipe.id] || { emoji: '⚗️', color: 'from-indigo-400 to-purple-500' } : null

  // Start game
  useEffect(() => {
    const init = async () => {
      try {
        const result = await startGame({ themeId: 'BOND_AND_BURN', difficulty: difficultyToNumber(difficulty) })
        if (!result.canPlay) { navigate(ROUTES.SUBSCRIPTION, { state: { premiumRequired: true }, replace: true }); return }
        setGameId(result.id)
        setRecipes(selectRecipes(difficulty, config.recipes))
        setRecipeStartTime(Date.now())
        setPhase('playing')
      } catch { navigate(ROUTES.BOND_AND_BURN_SETUP, { replace: true }) }
    }
    init()
    return () => clearIntervals()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'playing') { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000) }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  useEffect(() => {
    if (phase === 'playing') {
      const heatMult = 1 + currentRecipeIndex * 0.2
      heatRef.current = setInterval(() => {
        setHeatLevel(h => {
          const next = calculateHeat(h, config.heatRisePerSecond * 0.1 * heatMult)
          if (next >= 100) { triggerMeltdown(); return 100 }
          return next
        })
      }, 100)
    }
    return () => { if (heatRef.current) clearInterval(heatRef.current) }
  }, [phase, currentRecipeIndex, config.heatRisePerSecond]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearIntervals() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (heatRef.current) clearInterval(heatRef.current)
  }

  const triggerMeltdown = useCallback(() => {
    clearIntervals()
    setPhase('meltdown')
    setShakeScreen(true)
    setTimeout(() => { setShakeScreen(false); handleGameEnd(true) }, 2000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Drop element into flask (works for both drag-drop and tap)
  function handleDropElement(symbol: string) {
    if (phase !== 'playing' || !currentRecipe) return
    setTotalAttempts(a => a + 1)
    setDraggingElement(null)
    setFlaskHover(false)

    if (canPlaceElement(beaker, currentRecipe, symbol)) {
      const newBeaker = [...beaker, symbol]
      setBeaker(newBeaker)
      if (checkRecipeComplete(newBeaker, currentRecipe)) handleReaction()
    } else {
      setCombo(1)
      setHeatLevel(h => calculateHeat(h, config.heatPenaltyWrong))
      setWrongPick(symbol)
      setTimeout(() => setWrongPick(''), 500)
    }
  }

  function handleReaction() {
    clearIntervals()
    setPhase('reacting')
    setReactionAnimation(true)
    setTimeout(() => {
      const timeTaken = (Date.now() - recipeStartTime) / 1000
      const recipeScore = calculateRecipeScore(currentRecipe, timeTaken, combo, difficulty)
      setScore(s => s + recipeScore)
      setCombo(c => c + 1)
      setHeatLevel(h => calculateHeat(h, -config.heatDropOnSuccess))
      setRoundsCompleted(r => r + 1)
      setShowFunFact(currentRecipe.funFact)
      setTimeout(() => {
        setReactionAnimation(false)
        setShowFunFact('')
        const nextIdx = currentRecipeIndex + 1
        if (nextIdx >= recipes.length) { setPhase('complete'); setTimeout(() => handleGameEnd(false), 1000) }
        else { setBeaker([]); setCurrentRecipeIndex(nextIdx); setRecipeStartTime(Date.now()); setPhase('playing') }
      }, 4500)
    }, 1200)
  }

  async function handleGameEnd(isMeltdown: boolean) {
    setPhase('submitting')
    const correctAnswers = roundsCompleted + (isMeltdown ? 0 : 1)
    try {
      const result = await completeGame({ gameId, completionTime: timer, attempts: totalAttempts || 1, correctAnswers, totalQuestions: recipes.length })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setShowScoreModal(true)
      setPhase('complete')
    } catch { setPhase('complete'); setShowScoreModal(true) }
  }

  // Drag handlers
  function handleDragStart(symbol: string) { setDraggingElement(symbol) }
  function handleDragEnd() { setDraggingElement(null); setFlaskHover(false) }
  function handleFlaskDragOver(e: React.DragEvent) { e.preventDefault(); setFlaskHover(true) }
  function handleFlaskDragLeave() { setFlaskHover(false) }
  function handleFlaskDrop(e: React.DragEvent) {
    e.preventDefault()
    if (draggingElement) handleDropElement(draggingElement)
  }
  // Touch drag support
  function handleTouchEnd(symbol: string, e: React.TouchEvent) {
    const touch = e.changedTouches[0]
    if (flaskRef.current) {
      const rect = flaskRef.current.getBoundingClientRect()
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        handleDropElement(symbol)
      }
    }
    setDraggingElement(null)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Periodic table data
  const PERIODIC_TABLE_FULL = [
    { symbol: 'H', name: 'Hydrogen', row: 1, col: 1, cat: 'nonmetal' },
    { symbol: 'He', name: 'Helium', row: 1, col: 18, cat: 'noble' },
    { symbol: 'Li', name: 'Lithium', row: 2, col: 1, cat: 'alkali' },
    { symbol: 'Be', name: 'Beryllium', row: 2, col: 2, cat: 'alkaline' },
    { symbol: 'B', name: 'Boron', row: 2, col: 13, cat: 'metalloid' },
    { symbol: 'C', name: 'Carbon', row: 2, col: 14, cat: 'nonmetal' },
    { symbol: 'N', name: 'Nitrogen', row: 2, col: 15, cat: 'nonmetal' },
    { symbol: 'O', name: 'Oxygen', row: 2, col: 16, cat: 'nonmetal' },
    { symbol: 'F', name: 'Fluorine', row: 2, col: 17, cat: 'halogen' },
    { symbol: 'Ne', name: 'Neon', row: 2, col: 18, cat: 'noble' },
    { symbol: 'Na', name: 'Sodium', row: 3, col: 1, cat: 'alkali' },
    { symbol: 'Mg', name: 'Magnesium', row: 3, col: 2, cat: 'alkaline' },
    { symbol: 'Al', name: 'Aluminum', row: 3, col: 13, cat: 'post-trans' },
    { symbol: 'Si', name: 'Silicon', row: 3, col: 14, cat: 'metalloid' },
    { symbol: 'P', name: 'Phosphorus', row: 3, col: 15, cat: 'nonmetal' },
    { symbol: 'S', name: 'Sulfur', row: 3, col: 16, cat: 'nonmetal' },
    { symbol: 'Cl', name: 'Chlorine', row: 3, col: 17, cat: 'halogen' },
    { symbol: 'Ar', name: 'Argon', row: 3, col: 18, cat: 'noble' },
    { symbol: 'K', name: 'Potassium', row: 4, col: 1, cat: 'alkali' },
    { symbol: 'Ca', name: 'Calcium', row: 4, col: 2, cat: 'alkaline' },
    { symbol: 'Ti', name: 'Titanium', row: 4, col: 4, cat: 'transition' },
    { symbol: 'Cr', name: 'Chromium', row: 4, col: 6, cat: 'transition' },
    { symbol: 'Mn', name: 'Manganese', row: 4, col: 7, cat: 'transition' },
    { symbol: 'Fe', name: 'Iron', row: 4, col: 8, cat: 'transition' },
    { symbol: 'Co', name: 'Cobalt', row: 4, col: 9, cat: 'transition' },
    { symbol: 'Ni', name: 'Nickel', row: 4, col: 10, cat: 'transition' },
    { symbol: 'Cu', name: 'Copper', row: 4, col: 11, cat: 'transition' },
    { symbol: 'Zn', name: 'Zinc', row: 4, col: 12, cat: 'transition' },
    { symbol: 'Ga', name: 'Gallium', row: 4, col: 13, cat: 'post-trans' },
    { symbol: 'Ge', name: 'Germanium', row: 4, col: 14, cat: 'metalloid' },
    { symbol: 'As', name: 'Arsenic', row: 4, col: 15, cat: 'metalloid' },
    { symbol: 'Se', name: 'Selenium', row: 4, col: 16, cat: 'nonmetal' },
    { symbol: 'Br', name: 'Bromine', row: 4, col: 17, cat: 'halogen' },
    { symbol: 'Kr', name: 'Krypton', row: 4, col: 18, cat: 'noble' },
  ]
  const PERIODIC_TABLE = difficulty === 'easy' ? PERIODIC_TABLE_FULL.filter(el => el.row <= 2)
    : difficulty === 'medium' ? PERIODIC_TABLE_FULL.filter(el => el.row <= 3) : PERIODIC_TABLE_FULL

  const CAT_COLORS: Record<string, string> = {
    'nonmetal': 'bg-sky-700/80', 'noble': 'bg-violet-700/80', 'alkali': 'bg-rose-700/80',
    'alkaline': 'bg-orange-700/80', 'metalloid': 'bg-teal-700/80', 'halogen': 'bg-yellow-700/80',
    'transition': 'bg-blue-700/80', 'post-trans': 'bg-emerald-700/80',
  }
  const GAME_ELEMENTS = new Set(config.elements)
  const heatBarColor = heatLevel < 40 ? 'from-emerald-400 to-emerald-600'
    : heatLevel < 70 ? 'from-yellow-400 to-orange-500'
    : heatLevel < 85 ? 'from-orange-500 to-red-500' : 'from-red-500 to-red-700'

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center"><div className="text-6xl mb-4 animate-bounce">⚗️</div>
        <div className="text-indigo-200 text-xl font-bold animate-pulse">{t('bondAndBurn.preparingLab')}</div></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex flex-col overflow-hidden ${shakeScreen ? 'animate-shake' : ''}`}>
      {phase === 'meltdown' && (
        <div className="absolute inset-0 bg-red-600/40 animate-pulse z-50 pointer-events-none flex items-center justify-center">
          <div className="text-center"><div className="text-8xl animate-bounce">💥</div>
          <div className="text-red-200 text-3xl font-black mt-4">{t('bondAndBurn.meltdown')}</div></div>
        </div>
      )}
      {phase === 'complete' && !showScoreModal && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/80">
          <div className="text-center"><div className="text-6xl mb-3">🎉</div>
          <div className="text-white text-2xl font-bold">{t('bondAndBurn.labComplete')}</div></div>
        </div>
      )}

      {/* Top: Heat bar + stats */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative h-3 bg-slate-700/60 rounded-full overflow-hidden border border-slate-600/40">
          <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${heatBarColor} rounded-full transition-all duration-300 ${heatLevel > 85 ? 'animate-pulse' : ''}`} style={{ width: `${heatLevel}%` }} />
          <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-white drop-shadow">🌡️ {Math.round(heatLevel)}%</span></div>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="text-slate-300">⏱ <span className="font-mono font-bold text-white">{formatTime(timer)}</span></span>
          <span className="text-slate-300">🏆 <span className="font-bold text-emerald-400">{calculateFinalScore(score)}</span></span>
          <span className="text-slate-300">{t('bondAndBurn.round')} <span className="font-bold text-white">{currentRecipeIndex + 1}/{recipes.length}</span></span>
          {combo > 1 && <span className="font-bold text-yellow-400">🔥 {combo}x</span>}
        </div>
      </div>

      {/* Main area: Recipe + Flask */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 gap-3 min-h-0">
        {/* Recipe card */}
        {currentRecipe && phase === 'playing' && (
          <div className="w-full max-w-md text-center">
            <h2 className="text-white text-xl md:text-2xl font-black mb-1">
              {t('bondAndBurn.make')} {t(`bondAndBurn.recipes.${currentRecipe.id}.name`)} <span className="text-indigo-300 font-mono">{currentRecipe.formula}</span>
            </h2>
            <div className="bg-indigo-900/50 rounded-xl px-3 py-1.5 border border-indigo-400/20 inline-block">
              <p className="text-indigo-100 text-xs">💡 {t(`bondAndBurn.recipes.${currentRecipe.id}.hint`)}</p>
            </div>
          </div>
        )}

        {/* Flask — drop zone */}
        {(phase === 'playing' || phase === 'reacting') && (
        <div
          ref={flaskRef}
          onDragOver={handleFlaskDragOver}
          onDragLeave={handleFlaskDragLeave}
          onDrop={handleFlaskDrop}
          className={`relative w-44 h-52 md:w-52 md:h-60 transition-all duration-300 ${flaskHover ? 'scale-105' : ''}`}
        >
          {/* Flask SVG shape */}
          <svg viewBox="0 0 200 260" className="absolute inset-0 w-full h-full" fill="none">
            {/* Flask neck */}
            <rect x="75" y="0" width="50" height="60" rx="6" fill="#1e293b" stroke={flaskHover ? '#818cf8' : '#475569'} strokeWidth="2" />
            {/* Flask body */}
            <path d="M75 60 L30 160 Q20 200 50 230 L150 230 Q180 200 170 160 L125 60" fill="#1e293b" stroke={flaskHover ? '#818cf8' : '#475569'} strokeWidth="2" />
            {/* Liquid level */}
            {beaker.length > 0 && (
              <path d={`M40 ${220 - beaker.length * 18} Q100 ${210 - beaker.length * 18} 160 ${220 - beaker.length * 18} L160 220 Q150 235 50 235 L40 220 Z`}
                fill="url(#liquidGrad)" opacity="0.6" />
            )}
            {/* Flask highlight */}
            <path d="M85 70 L55 140" stroke="white" strokeWidth="1.5" opacity="0.1" strokeLinecap="round" />
            <defs>
              <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Atoms floating inside flask */}
          {!reactionAnimation && beaker.map((sym, i) => (
            <div key={i} className={`absolute w-8 h-8 rounded-full ${ELEMENTS[sym].color} flex items-center justify-center text-white text-xs font-bold shadow-lg animate-float border border-white/20`}
              style={{ left: `${30 + (i % 3) * 25}%`, top: `${55 + Math.floor(i / 3) * 18}%`, animationDelay: `${i * 0.3}s` }}>
              {sym}
            </div>
          ))}

          {/* Reaction result */}
          {reactionAnimation && compoundVisual && (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-reaction">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${compoundVisual.color} flex items-center justify-center shadow-2xl animate-pulse`}>
                <span className="text-4xl">{compoundVisual.emoji}</span>
              </div>
              <div className="mt-2 text-white font-bold text-sm">{t(`bondAndBurn.recipes.${currentRecipe.id}.name`)}!</div>
            </div>
          )}

          {/* Bubbles */}
          {reactionAnimation && <>
            <div className="absolute w-3 h-3 bg-white/30 rounded-full animate-bubble-1 bottom-16 left-1/4" />
            <div className="absolute w-2 h-2 bg-white/20 rounded-full animate-bubble-2 bottom-20 right-1/4" />
            <div className="absolute w-2.5 h-2.5 bg-white/25 rounded-full animate-bubble-3 bottom-12 left-1/2" />
          </>}

          {/* Drop hint */}
          {phase === 'playing' && beaker.length === 0 && !flaskHover && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-500 text-xs text-center px-4">Drag elements here<br/>or tap to add</span>
            </div>
          )}
        </div>
        )}

        {/* Fun fact */}
        {showFunFact && (
          <div className="w-full max-w-md bg-emerald-900/50 rounded-xl px-4 py-2 border border-emerald-400/30 text-center animate-fade-in">
            <p className="text-emerald-100 text-xs">🧠 {t(`bondAndBurn.recipes.${currentRecipe.id}.funFact`)}</p>
          </div>
        )}
      </div>

      {/* Periodic Table */}
      {phase === 'playing' && currentRecipe && (
        <div className="px-2 pb-3">
          <div className="text-center text-slate-500 text-[9px] mb-1 uppercase tracking-wider">{t('bondAndBurn.pickElements')}</div>
          <div className="max-w-2xl mx-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(18, 1fr)', gap: '2px' }}>
            {PERIODIC_TABLE.map((el) => {
              const isGameElement = GAME_ELEMENTS.has(el.symbol)
              const isWrong = wrongPick === el.symbol
              return (
                <button
                  key={el.symbol}
                  draggable
                  onDragStart={() => handleDragStart(el.symbol)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={() => setDraggingElement(el.symbol)}
                  onTouchEnd={(e) => handleTouchEnd(el.symbol, e)}
                  onClick={() => handleDropElement(el.symbol)}
                  className={`h-9 md:h-10 rounded flex flex-col items-center justify-center transition-all duration-100 select-none text-center leading-none cursor-grab active:cursor-grabbing ${
                    isWrong ? 'bg-red-500/60 border border-red-400 scale-95'
                    : difficulty === 'hard'
                      ? `${CAT_COLORS[el.cat]} border border-white/20 hover:scale-110 hover:border-white/60 hover:shadow-lg hover:z-10 active:scale-95`
                      : isGameElement
                        ? `${CAT_COLORS[el.cat]} border border-white/30 hover:scale-110 hover:border-white/70 hover:shadow-lg hover:z-10 active:scale-95`
                        : `${CAT_COLORS[el.cat]} opacity-50 border border-white/10 hover:opacity-80 hover:scale-105 active:scale-95`
                  }`}
                  style={{ gridRow: el.row, gridColumn: el.col }}
                >
                  <span className="text-white text-[10px] md:text-xs font-bold leading-none">{el.symbol}</span>
                  <span className="text-white/50 text-[6px] leading-none mt-px hidden md:block">{el.name.slice(0, 4)}</span>
                </button>
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
        onPlayAgain={() => navigate(ROUTES.BOND_AND_BURN_SETUP)}
        gameType="BOND_AND_BURN"
      />

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .animate-shake { animation: shake 0.4s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .animate-float { animation: float 2s ease-in-out infinite; }
        @keyframes reaction { 0%{transform:scale(0.3);opacity:0} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        .animate-reaction { animation: reaction 0.8s ease-out forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes bubble1 { 0%{transform:translateY(0) scale(1);opacity:0.6} 100%{transform:translateY(-50px) scale(0.3);opacity:0} }
        @keyframes bubble2 { 0%{transform:translateY(0) scale(1);opacity:0.5} 100%{transform:translateY(-70px) scale(0.2);opacity:0} }
        @keyframes bubble3 { 0%{transform:translateY(0) scale(1);opacity:0.4} 100%{transform:translateY(-40px) scale(0.4);opacity:0} }
        .animate-bubble-1 { animation: bubble1 1.5s ease-out infinite; }
        .animate-bubble-2 { animation: bubble2 1.8s ease-out infinite 0.3s; }
        .animate-bubble-3 { animation: bubble3 1.2s ease-out infinite 0.6s; }
      `}</style>
    </div>
  )
}
