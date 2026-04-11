import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { generateQuestions, type GeoQuestion, type GameMode, COUNTRY_SILHOUETTES } from '@/utils/geoQuizData'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { useTranslation } from 'react-i18next'

const TOTAL_QUESTIONS = 10
const TIMER_BY_DIFFICULTY: Record<string, number> = { easy: 15, medium: 12, hard: 10 }

type Phase = 'playing' | 'feedback' | 'submitting' | 'completed'

export default function GeoQuizGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const difficulty = searchParams.get('difficulty') || 'easy'
  const mode = (searchParams.get('mode') || 'capitals') as GameMode
  const timeLimit = TIMER_BY_DIFFICULTY[difficulty] || 15

  // All hooks declared unconditionally at the top
  const [gameId, setGameId] = useState('')
  const [questions, setQuestions] = useState<GeoQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [timer, setTimer] = useState(timeLimit)
  const [totalTime, setTotalTime] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [, setBestStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [showHint1, setShowHint1] = useState(false)
  const [showHint2, setShowHint2] = useState(false)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQuestion = useMemo(() => questions[currentIdx], [questions, currentIdx])

  // Generate questions on mount
  useEffect(() => {
    setQuestions(generateQuestions(mode, TOTAL_QUESTIONS))
  }, [mode])

  // Start backend game
  useEffect(() => {
    const init = async () => {
      try {
        const diffMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
        const game = await startGame({
          themeId: 'GEO_QUIZ',
          difficulty: diffMap[difficulty] || 1,
        })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
        }
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Total game timer
  useEffect(() => {
    totalTimerRef.current = setInterval(() => setTotalTime(t => t + 1), 1000)
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current) }
  }, [])

  // Per-question countdown timer + hints
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return
    setTimer(timeLimit)
    setShowHint1(false)
    setShowHint2(false)

    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = timeLimit - elapsed
      setTimer(Math.max(0, remaining))
      if (elapsed >= 5) setShowHint1(true)
      if (elapsed >= 10) setShowHint2(true)
      if (remaining <= 0) {
        // Time's up — treat as wrong answer
        clearInterval(timerRef.current!)
        timerRef.current = null
        handleAnswer('')
      }
    }, 200)

    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [currentIdx, phase === 'playing' ? 'playing' : 'other']) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((answer: string) => {
    if (phase !== 'playing' || !currentQuestion) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    const correct = answer === currentQuestion.correctAnswer
    setSelectedAnswer(answer)
    setIsCorrect(correct)
    setPhase('feedback')

    if (correct) {
      const timeBonus = Math.max(0, timer * 10)
      const streakBonus = streak * 25
      const points = 100 + timeBonus + streakBonus
      setScore(s => s + points)
      setCorrectCount(c => c + 1)
      setStreak(s => {
        const newStreak = s + 1
        setBestStreak(b => Math.max(b, newStreak))
        return newStreak
      })
    } else {
      setStreak(0)
    }

    // Auto-advance after showing feedback
    feedbackTimeoutRef.current = setTimeout(() => {
      if (currentIdx + 1 >= TOTAL_QUESTIONS) {
        finishGame(correct ? correctCount + 1 : correctCount)
      } else {
        setCurrentIdx(i => i + 1)
        setSelectedAnswer('')
        setPhase('playing')
      }
    }, 2500)
  }, [phase, currentQuestion, timer, streak, currentIdx, correctCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const finishGame = async (finalCorrect: number) => {
    if (totalTimerRef.current) { clearInterval(totalTimerRef.current); totalTimerRef.current = null }
    setPhase('submitting')
    try {
      const result = await completeGame({
        gameId,
        completionTime: Math.max(1, totalTime),
        attempts: TOTAL_QUESTIONS,
        correctAnswers: finalCorrect,
        totalQuestions: TOTAL_QUESTIONS,
      })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setPhase('completed')
    } catch {
      setPhase('completed')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (totalTimerRef.current) clearInterval(totalTimerRef.current)
    }
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const timerColor = timer <= 3 ? 'text-red-400' : timer <= 7 ? 'text-yellow-400' : 'text-emerald-400'

  if (!currentQuestion && phase !== 'submitting' && phase !== 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
          <p className="text-white/60">{t('gameplay.loadingQuestions')}</p>
        </div>
      </div>
    )
  }

  // Render silhouette for hard mode — auto-zoom using ref to get bounding box
  const SilhouetteSVG = ({ pathData }: { pathData: string }) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const [vb, setVb] = useState('0 0 2000 1001')
    useEffect(() => {
      if (svgRef.current) {
        const path = svgRef.current.querySelector('path')
        if (path) {
          const bbox = path.getBBox()
          const pad = Math.max(bbox.width, bbox.height) * 0.1
          setVb(`${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`)
        }
      }
    }, [pathData])
    return (
      <svg ref={svgRef} viewBox={vb} className="w-48 h-48 md:w-56 md:h-56 drop-shadow-lg">
        <path d={pathData} fill="white" opacity="0.9" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
    )
  }

  const renderSilhouette = (countryName: string) => {
    const pathData = COUNTRY_SILHOUETTES[countryName]
    if (!pathData) return <div className="text-6xl">🗺️</div>
    return <SilhouetteSVG pathData={pathData} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 py-4 px-2 md:px-4 select-none">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.GEO_QUIZ_SETUP)} className="text-white text-lg font-bold hover:underline">
            {t('game.back')}
          </button>
          <div className="flex items-center gap-3 text-white font-bold text-sm md:text-base">
            <span>⏱️ {formatTime(totalTime)}</span>
            <span>Q {currentIdx + 1}/{TOTAL_QUESTIONS}</span>
            <span className="text-emerald-300">🎯 {score}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-4 mx-2">
          <div
            className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentIdx + (phase === 'feedback' ? 1 : 0)) / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>

        {/* Timer bar */}
        <div className="mx-2 mb-4">
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-200 ${
                timer <= 3 ? 'bg-red-500' : timer <= 7 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${(timer / timeLimit) * 100}%` }}
            />
          </div>
          <div className={`text-center text-sm font-bold mt-1 ${timerColor}`}>
            {timer}s
          </div>
        </div>

        {/* Streak indicator */}
        {streak > 1 && phase === 'playing' && (
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm font-bold">
              🔥 {streak} {t('game.streak')} (+{streak * 25} {t('game.bonus')})
            </span>
          </div>
        )}

        {/* Question card */}
        {currentQuestion && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4">
            {/* Prompt */}
            <div className="text-center mb-6">
              {mode === 'silhouettes' ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm text-white/50 font-bold">{t('gameplay.whichCountry')}</div>
                  {renderSilhouette(currentQuestion.prompt)}
                </div>
              ) : (
                <>
                  {currentQuestion.promptEmoji && (
                    <div className="text-5xl mb-3">{currentQuestion.promptEmoji}</div>
                  )}
                  <h2 className="text-xl md:text-2xl font-bold text-white">{currentQuestion.prompt}</h2>
                </>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                let btnClass = 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                if (phase === 'feedback') {
                  if (option === currentQuestion.correctAnswer) {
                    btnClass = 'border-green-400 bg-green-500/30'
                  } else if (option === selectedAnswer && !isCorrect) {
                    btnClass = 'border-red-400 bg-red-500/30'
                  } else {
                    btnClass = 'border-white/10 bg-white/5 opacity-50'
                  }
                }
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    disabled={phase !== 'playing'}
                    className={`p-4 rounded-xl border-2 transition-all text-left text-white font-bold ${btnClass}`}
                  >
                    {option}
                    {phase === 'feedback' && option === currentQuestion.correctAnswer && (
                      <span className="ml-2">✅</span>
                    )}
                    {phase === 'feedback' && option === selectedAnswer && !isCorrect && (
                      <span className="ml-2">❌</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Hints */}
            {phase === 'playing' && (
              <div className="mt-4 space-y-1 text-center">
                {showHint1 && currentQuestion.hint1 && (
                  <p className="text-yellow-300/80 text-sm">💡 {currentQuestion.hint1}</p>
                )}
                {showHint2 && currentQuestion.hint2 && (
                  <p className="text-yellow-300/60 text-sm">💡 {currentQuestion.hint2}</p>
                )}
              </div>
            )}

            {/* Feedback + Fun fact */}
            {phase === 'feedback' && (
              <div className="mt-4 text-center">
                <div className={`text-lg font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? `🎉 ${t('game.correct')}` : `❌ ${t('gameplay.theAnswerWas', { answer: currentQuestion.correctAnswer })}`}
                </div>
                {currentQuestion.funFact && (
                  <div className="bg-white/5 rounded-xl p-3 text-sm text-white/70">
                    🌟 {currentQuestion.funFact}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score Modal */}
      {phase === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal
          isOpen={true}
          onClose={() => navigate(ROUTES.HUB)}
          scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank}
          onPlayAgain={() => navigate(ROUTES.GEO_QUIZ_SETUP)}
          gameType="GEO_QUIZ"
        />
      )}

      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🌍</div>
            <p className="text-xl font-bold">{t('game.calculating')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
