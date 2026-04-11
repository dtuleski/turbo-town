import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { generateCivicsQuestions, type CivicsGameQuestion, type CivicsCategory } from '@/utils/civicsQuizData'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'
import { useTranslation } from 'react-i18next'

const TIME_LIMIT = 20

type Phase = 'playing' | 'feedback' | 'submitting' | 'completed'

export default function CivicsQuizGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const category = (searchParams.get('category') || 'all') as CivicsCategory
  const totalQuestions = parseInt(searchParams.get('questions') || '10', 10)
  const level = searchParams.get('level') || 'medium'
  const difficultyNum = level === 'easy' ? 1 : level === 'hard' ? 3 : 2

  const [gameId, setGameId] = useState('')
  const [questions, setQuestions] = useState<CivicsGameQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [timer, setTimer] = useState(TIME_LIMIT)
  const [totalTime, setTotalTime] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [, setBestStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQuestion = useMemo(() => questions[currentIdx], [questions, currentIdx])

  useEffect(() => { setQuestions(generateCivicsQuestions(category, totalQuestions)) }, [category])

  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({ themeId: 'CIVICS_QUIZ', difficulty: difficultyNum })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED')
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    totalTimerRef.current = setInterval(() => setTotalTime(t => t + 1), 1000)
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current) }
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return
    setTimer(TIME_LIMIT)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const remaining = TIME_LIMIT - elapsed
      setTimer(Math.max(0, remaining))
      if (remaining <= 0) { clearInterval(timerRef.current!); timerRef.current = null; handleAnswer('') }
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
      setScore(s => s + 100 + timeBonus + streakBonus)
      setCorrectCount(c => c + 1)
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
    } else { setStreak(0) }
    feedbackTimeoutRef.current = setTimeout(() => {
      if (currentIdx + 1 >= totalQuestions) finishGame(correct ? correctCount + 1 : correctCount)
      else { setCurrentIdx(i => i + 1); setSelectedAnswer(''); setPhase('playing') }
    }, 2500)
  }, [phase, currentQuestion, timer, streak, currentIdx, correctCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const finishGame = async (finalCorrect: number) => {
    if (totalTimerRef.current) { clearInterval(totalTimerRef.current); totalTimerRef.current = null }
    setPhase('submitting')
    try {
      const result = await completeGame({ gameId, completionTime: Math.max(1, totalTime), attempts: totalQuestions, correctAnswers: finalCorrect, totalQuestions: totalQuestions })
      setScoreBreakdown(result.scoreBreakdown); setLeaderboardRank(result.leaderboardRank); setPhase('completed')
    } catch { setPhase('completed') }
  }

  useEffect(() => () => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (totalTimerRef.current) clearInterval(totalTimerRef.current)
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const timerColor = timer <= 3 ? 'text-red-400' : timer <= 7 ? 'text-yellow-400' : 'text-blue-300'

  if (!currentQuestion && phase !== 'submitting' && phase !== 'completed') {
    return (<div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 flex items-center justify-center">
      <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" /><p className="text-white/60">{t('gameplay.loadingQuestions')}</p></div></div>)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 py-4 px-2 md:px-4 select-none">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.CIVICS_QUIZ_SETUP)} className="text-white text-lg font-bold hover:underline">{t('game.back')}</button>
          <div className="flex items-center gap-3 text-white font-bold text-sm md:text-base">
            <span>⏱️ {formatTime(totalTime)}</span><span>Q {currentIdx + 1}/{totalQuestions}</span><span className="text-blue-300">🎯 {score}</span>
          </div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 mb-4 mx-2">
          <div className="bg-blue-400 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentIdx + (phase === 'feedback' ? 1 : 0)) / totalQuestions) * 100}%` }} />
        </div>
        <div className="mx-2 mb-4">
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-200 ${timer <= 3 ? 'bg-red-500' : timer <= 7 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${(timer / TIME_LIMIT) * 100}%` }} />
          </div>
          <div className={`text-center text-sm font-bold mt-1 ${timerColor}`}>{timer}s</div>
        </div>
        {streak > 1 && phase === 'playing' && (
          <div className="text-center mb-3"><span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-bold">🔥 {streak} {t('game.streak')} (+{streak * 25} {t('game.bonus')})</span></div>
        )}
        {currentQuestion && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">{currentQuestion.emoji}</div>
              <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">{currentQuestion.subcategory}</div>
              <h2 className="text-lg md:text-xl font-bold text-white leading-relaxed">{currentQuestion.question}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                let btnClass = 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                if (phase === 'feedback') {
                  if (option === currentQuestion.correctAnswer) btnClass = 'border-green-400 bg-green-500/30'
                  else if (option === selectedAnswer && !isCorrect) btnClass = 'border-red-400 bg-red-500/30'
                  else btnClass = 'border-white/10 bg-white/5 opacity-50'
                }
                return (<button key={option} onClick={() => handleAnswer(option)} disabled={phase !== 'playing'}
                  className={`p-4 rounded-xl border-2 transition-all text-left text-white font-bold ${btnClass}`}>
                  {option}
                  {phase === 'feedback' && option === currentQuestion.correctAnswer && <span className="ml-2">✅</span>}
                  {phase === 'feedback' && option === selectedAnswer && !isCorrect && <span className="ml-2">❌</span>}
                </button>)
              })}
            </div>
            {phase === 'feedback' && (
              <div className="mt-4 text-center">
                <div className={`text-lg font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? `🎉 ${t('game.correct')}` : `❌ ${t('gameplay.answer', { answer: currentQuestion.correctAnswer })}`}
                </div>
                {currentQuestion.funFact && <div className="bg-white/5 rounded-xl p-3 text-sm text-white/70">🌟 {currentQuestion.funFact}</div>}
              </div>
            )}
          </div>
        )}
      </div>
      {phase === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal isOpen={true} onClose={() => navigate(ROUTES.HUB)} scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank} onPlayAgain={() => navigate(ROUTES.CIVICS_QUIZ_SETUP)} gameType="CIVICS_QUIZ" />
      )}
      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center"><div className="text-4xl mb-4 animate-bounce">🇺🇸</div><p className="text-xl font-bold">{t('game.calculating')}</p></div>
        </div>
      )}
    </div>
  )
}
