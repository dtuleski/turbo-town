import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import {
  DIFFICULTY_CONFIG,
  THEMES,
  MAX_LIVES,
  pickChallengeCards,
  shuffle,
  type SeqDifficulty,
  type SeqTheme,
  type DriverCard,
} from '@/utils/sequenceMemoryUtils'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type Phase = 'loading' | 'showing' | 'answering' | 'correct' | 'wrong' | 'game-over' | 'submitting' | 'completed'

export default function SequenceMemoryGamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = (searchParams.get('difficulty') || 'easy') as SeqDifficulty
  const themeId = (searchParams.get('theme') || 'f1-2025') as SeqTheme

  const config = DIFFICULTY_CONFIG[difficulty]
  const themeData = THEMES[themeId]
  const allDrivers = themeData.drivers

  const [gameId, setGameId] = useState('')
  const [challengeCards, setChallengeCards] = useState<DriverCard[]>([])
  const [currentRound, setCurrentRound] = useState(0) // 0-indexed: round N reveals cards 0..N
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [lives, setLives] = useState(MAX_LIVES)
  const [phase, setPhase] = useState<Phase>('loading')
  const [answerIndex, setAnswerIndex] = useState(0) // which card in the sequence the player needs to pick next
  const [correctRounds, setCorrectRounds] = useState(0)
  const [totalMistakes, setTotalMistakes] = useState(0)
  const [timer, setTimer] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [correctFlash, setCorrectFlash] = useState<string | null>(null)
  const [shuffledBank, setShuffledBank] = useState<DriverCard[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize game
  useEffect(() => {
    const init = async () => {
      try {
        const game = await startGame({
          themeId: 'SEQUENCE_MEMORY',
          difficulty: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
          return
        }
      }

      const picked = pickChallengeCards(themeId, config.cards)
      setChallengeCards(picked)
      setShuffledBank(shuffle([...allDrivers]))
      setPhase('showing')
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer (runs during answering phase)
  useEffect(() => {
    if (phase === 'answering') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
      }
    }
    if (phase === 'showing' || phase === 'correct') {
      // pause timer during reveal
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    if (['game-over', 'submitting', 'completed'].includes(phase)) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => {}
  }, [phase])

  // Show phase: reveal cards for viewTime seconds with countdown
  useEffect(() => {
    if (phase !== 'showing' || challengeCards.length === 0) return

    // Reveal cards 0..currentRound
    const idsToReveal = new Set(challengeCards.slice(0, currentRound + 1).map(c => c.id))
    setRevealedIds(idsToReveal)
    setCountdown(config.viewTime)

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          // Hide cards and switch to answering
          setRevealedIds(new Set())
          setAnswerIndex(0)
          setPhase('answering')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [phase, currentRound, challengeCards, config.viewTime])

  // Handle player tapping a card in the answer bank
  const handleBankTap = useCallback((driver: DriverCard) => {
    if (phase !== 'answering') return

    const expectedCard = challengeCards[answerIndex]
    if (driver.id === expectedCard.id) {
      // Correct
      setCorrectFlash(driver.id)
      setTimeout(() => setCorrectFlash(null), 400)

      const nextAnswerIndex = answerIndex + 1
      if (nextAnswerIndex > currentRound) {
        // Completed this round
        setCorrectRounds(prev => prev + 1)

        if (currentRound + 1 >= challengeCards.length) {
          // All rounds done — game complete
          finishGame(correctRounds + 1, totalMistakes)
        } else {
          // Show "correct" feedback briefly, then advance
          setPhase('correct')
          setTimeout(() => {
            setCurrentRound(prev => prev + 1)
            setPhase('showing')
          }, 800)
        }
      } else {
        setAnswerIndex(nextAnswerIndex)
      }
    } else {
      // Wrong
      setWrongFlash(driver.id)
      setTimeout(() => setWrongFlash(null), 500)
      setTotalMistakes(prev => prev + 1)

      const newLives = lives - 1
      setLives(newLives)

      if (newLives <= 0) {
        setPhase('game-over')
      }
      // Player keeps going — don't advance answerIndex
    }
  }, [phase, challengeCards, answerIndex, currentRound, lives, correctRounds, totalMistakes])

  // Finish game
  const finishGame = async (rounds: number, mistakes: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setPhase('submitting')

    try {
      const result = await completeGame({
        gameId,
        completionTime: Math.max(1, timer),
        attempts: rounds + mistakes,
        correctAnswers: rounds,
        totalQuestions: config.cards,
      })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setPhase('completed')
    } catch {
      setPhase('completed')
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Render a challenge card (top section)
  const renderChallengeCard = (card: DriverCard, _index: number) => {
    const isRevealed = revealedIds.has(card.id)
    return (
      <div
        key={card.id}
        className={`w-16 h-20 md:w-20 md:h-24 rounded-xl flex items-center justify-center text-center transition-all duration-300 shadow-md ${
          isRevealed
            ? `${card.teamColor} text-white`
            : 'bg-slate-700 border-2 border-slate-500'
        }`}
      >
        {isRevealed ? (
          <div className="px-1">
            <div className="text-xs md:text-sm font-black leading-tight">{card.name}</div>
            <div className="text-[10px] md:text-xs opacity-75">#{card.number}</div>
          </div>
        ) : (
          <div className="text-2xl">🏎️</div>
        )}
      </div>
    )
  }

  // Render an answer bank card (bottom section)
  const renderBankCard = (driver: DriverCard) => {
    const isWrong = wrongFlash === driver.id
    const isCorrect = correctFlash === driver.id
    return (
      <button
        key={driver.id}
        type="button"
        onClick={() => handleBankTap(driver)}
        disabled={phase !== 'answering'}
        className={`w-full p-2 md:p-3 rounded-xl transition-all text-white text-left ${driver.teamColor} ${
          isWrong ? 'ring-4 ring-red-400 animate-pulse scale-95' :
          isCorrect ? 'ring-4 ring-green-400 scale-105' :
          phase === 'answering' ? 'hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer' : 'opacity-70'
        }`}
      >
        <div className="font-bold text-sm md:text-base leading-tight">{driver.name}</div>
        <div className="text-[10px] md:text-xs opacity-75">{driver.team} · #{driver.number}</div>
      </button>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-4 px-2 md:px-4 select-none">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.SEQUENCE_MEMORY_SETUP)} className="text-white text-lg font-bold hover:underline">
            {t('game.back')}
          </button>
          <div className="flex items-center gap-3 text-white font-bold text-sm md:text-base">
            <span>⏱️ {formatTime(timer)}</span>
            <span>{'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}</span>
            <span>Round {Math.min(currentRound + 1, config.cards)}/{config.cards}</span>
          </div>
        </div>

        {/* Phase indicator */}
        {phase === 'showing' && (
          <div className="text-center mb-3">
            <span className="inline-block bg-yellow-400 text-black font-black text-lg px-4 py-1 rounded-full animate-pulse">
              MEMORIZE! {countdown}s
            </span>
          </div>
        )}
        {phase === 'answering' && (
          <div className="text-center mb-3">
            <span className="inline-block bg-green-500 text-white font-black text-lg px-4 py-1 rounded-full">
              SELECT CARD {answerIndex + 1} of {currentRound + 1}
            </span>
          </div>
        )}
        {phase === 'correct' && (
          <div className="text-center mb-3">
            <span className="inline-block bg-green-400 text-black font-black text-lg px-4 py-1 rounded-full">
              ✅ Correct! Next round...
            </span>
          </div>
        )}

        {/* Challenge cards (top) */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="text-white/60 text-sm font-bold mb-2 text-center">Challenge Sequence</div>
          <div className="flex flex-wrap justify-center gap-2">
            {challengeCards.map((card, i) => renderChallengeCard(card, i))}
          </div>
        </div>

        {/* Answer bank (bottom) */}
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4">
          <div className="text-white/60 text-sm font-bold mb-2 text-center">
            {themeData.name} — All Drivers
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {shuffledBank.map(driver => renderBankCard(driver))}
          </div>
        </div>

        {/* Game over overlay */}
        {phase === 'game-over' && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
              <div className="text-5xl mb-3">💔</div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Game Over!</h2>
              <p className="text-lg text-gray-600 mb-1">
                You completed {correctRounds} of {config.cards} rounds
              </p>
              <p className="text-gray-500 mb-4">{totalMistakes} mistakes</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => finishGame(correctRounds, totalMistakes)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  See Score
                </button>
                <button
                  onClick={() => navigate(ROUTES.SEQUENCE_MEMORY_SETUP)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-300"
                >
                  Try Again
                </button>
              </div>
            </div>
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
          onPlayAgain={() => navigate(ROUTES.SEQUENCE_MEMORY_SETUP)}
          gameType="SEQUENCE_MEMORY"
        />
      )}

      {phase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-bounce">🧠</div>
            <p className="text-xl font-bold">{t('game.calculating')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
