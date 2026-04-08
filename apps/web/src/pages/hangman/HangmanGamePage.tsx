import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { pickRandomWords, MAX_WRONG, ROUNDS_PER_GAME, type HangmanWord } from '@/utils/hangmanData'
import { startGame, completeGame } from '@/api/game'
import ScoreBreakdownModal from '@/components/game/ScoreBreakdownModal'

type RoundPhase = 'playing' | 'won' | 'lost'
type GamePhase = 'playing' | 'submitting' | 'completed'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// SVG Hangman parts (drawn progressively)
function HangmanSVG({ wrongCount }: { wrongCount: number }) {
  return (
    <svg viewBox="0 0 200 220" className="w-40 h-44 md:w-48 md:h-52">
      {/* Gallows */}
      <line x1="20" y1="210" x2="180" y2="210" stroke="#64748b" strokeWidth="4" />
      <line x1="60" y1="210" x2="60" y2="20" stroke="#64748b" strokeWidth="4" />
      <line x1="60" y1="20" x2="130" y2="20" stroke="#64748b" strokeWidth="4" />
      <line x1="130" y1="20" x2="130" y2="50" stroke="#64748b" strokeWidth="4" />
      {/* Head */}
      {wrongCount >= 1 && <circle cx="130" cy="70" r="20" stroke="#ef4444" strokeWidth="3" fill="none" />}
      {/* Body */}
      {wrongCount >= 2 && <line x1="130" y1="90" x2="130" y2="150" stroke="#ef4444" strokeWidth="3" />}
      {/* Left arm */}
      {wrongCount >= 3 && <line x1="130" y1="110" x2="100" y2="135" stroke="#ef4444" strokeWidth="3" />}
      {/* Right arm */}
      {wrongCount >= 4 && <line x1="130" y1="110" x2="160" y2="135" stroke="#ef4444" strokeWidth="3" />}
      {/* Left leg */}
      {wrongCount >= 5 && <line x1="130" y1="150" x2="105" y2="190" stroke="#ef4444" strokeWidth="3" />}
      {/* Right leg */}
      {wrongCount >= 6 && <line x1="130" y1="150" x2="155" y2="190" stroke="#ef4444" strokeWidth="3" />}
      {/* Face when dead */}
      {wrongCount >= 6 && (
        <>
          <line x1="122" y1="63" x2="128" y2="69" stroke="#ef4444" strokeWidth="2" />
          <line x1="128" y1="63" x2="122" y2="69" stroke="#ef4444" strokeWidth="2" />
          <line x1="132" y1="63" x2="138" y2="69" stroke="#ef4444" strokeWidth="2" />
          <line x1="138" y1="63" x2="132" y2="69" stroke="#ef4444" strokeWidth="2" />
          <path d="M122 80 Q130 75 138 80" stroke="#ef4444" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  )
}

export default function HangmanGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const difficulty = searchParams.get('difficulty') || 'easy'

  const [gameId, setGameId] = useState('')
  const [words, setWords] = useState<HangmanWord[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set())
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('playing')
  const [gamePhase, setGamePhase] = useState<GamePhase>('playing')
  const [totalScore, setTotalScore] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [timer, setTimer] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentWord = words[currentRound]
  const wrongLetters = currentWord ? [...guessedLetters].filter(l => !currentWord.word.includes(l)) : []
  const wrongCount = wrongLetters.length

  useEffect(() => {
    setWords(pickRandomWords(difficulty, ROUNDS_PER_GAME))
  }, [difficulty])

  useEffect(() => {
    const init = async () => {
      try {
        const diffMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
        const game = await startGame({ themeId: 'HANGMAN', difficulty: diffMap[difficulty] || 1 })
        setGameId(game.id)
      } catch (error: any) {
        if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED')
          navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true } })
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const guessLetter = useCallback((letter: string) => {
    if (roundPhase !== 'playing' || !currentWord || guessedLetters.has(letter)) return
    const newGuessed = new Set(guessedLetters)
    newGuessed.add(letter)
    setGuessedLetters(newGuessed)

    const isWrong = !currentWord.word.includes(letter)
    if (isWrong) {
      setTotalWrong(w => w + 1)
      const newWrongCount = [...newGuessed].filter(l => !currentWord.word.includes(l)).length
      if (newWrongCount >= MAX_WRONG) {
        setRoundPhase('lost')
      }
    } else {
      // Check if word is complete
      const allRevealed = currentWord.word.split('').every(l => newGuessed.has(l))
      if (allRevealed) {
        const roundWrong = [...newGuessed].filter(l => !currentWord.word.includes(l)).length
        const roundScore = Math.max(0, (MAX_WRONG - roundWrong) * 100 + 200) // 200 base + 100 per remaining life
        setTotalScore(s => s + roundScore)
        setRoundsWon(w => w + 1)
        setRoundPhase('won')
      }
    }
  }, [roundPhase, currentWord, guessedLetters])

  // Keyboard input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const letter = e.key.toUpperCase()
      if (ALPHABET.includes(letter)) guessLetter(letter)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [guessLetter])

  const nextRound = () => {
    if (currentRound + 1 >= ROUNDS_PER_GAME) {
      finishGame()
    } else {
      setCurrentRound(r => r + 1)
      setGuessedLetters(new Set())
      setRoundPhase('playing')
    }
  }

  const finishGame = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setGamePhase('submitting')
    try {
      const result = await completeGame({
        gameId,
        completionTime: Math.max(1, timer),
        attempts: totalWrong + roundsWon * 6, // total guesses approximation
        correctAnswers: roundsWon,
        totalQuestions: ROUNDS_PER_GAME,
      })
      setScoreBreakdown(result.scoreBreakdown)
      setLeaderboardRank(result.leaderboardRank)
      setGamePhase('completed')
    } catch { setGamePhase('completed') }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
      </div>
    )
  }

  const wordDisplay = currentWord.word.split('').map((letter) => ({
    letter,
    revealed: guessedLetters.has(letter) || roundPhase === 'lost',
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 py-4 px-2 md:px-4 select-none">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <button onClick={() => navigate(ROUTES.HANGMAN_SETUP)} className="text-white text-lg font-bold hover:underline">← Back</button>
          <div className="flex items-center gap-3 text-white font-bold text-sm md:text-base">
            <span>⏱️ {formatTime(timer)}</span>
            <span>Round {currentRound + 1}/{ROUNDS_PER_GAME}</span>
            <span className="text-yellow-300">⭐ {totalScore}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-4 mx-2">
          <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${((currentRound + (roundPhase !== 'playing' ? 1 : 0)) / ROUNDS_PER_GAME) * 100}%` }} />
        </div>

        {/* Hint + Category */}
        <div className="text-center mb-4">
          <span className="bg-white/10 text-white/60 text-xs font-bold px-3 py-1 rounded-full">{currentWord.category}</span>
          <p className="text-white/80 text-sm mt-2">💡 {currentWord.hint}</p>
        </div>

        {/* Hangman drawing */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/5 rounded-2xl p-4">
            <HangmanSVG wrongCount={wrongCount} />
          </div>
        </div>

        {/* Wrong guesses indicator */}
        <div className="text-center mb-4">
          <div className="flex justify-center gap-1">
            {Array.from({ length: MAX_WRONG }).map((_, idx) => (
              <div key={idx} className={`w-4 h-4 rounded-full ${idx < wrongCount ? 'bg-red-500' : 'bg-white/20'}`} />
            ))}
          </div>
          <p className="text-white/40 text-xs mt-1">{MAX_WRONG - wrongCount} guesses left</p>
        </div>

        {/* Word display */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {wordDisplay.map((slot, i) => (
            <div key={i} className={`w-10 h-12 md:w-12 md:h-14 border-b-4 flex items-center justify-center text-2xl md:text-3xl font-black ${
              slot.revealed
                ? roundPhase === 'lost' && !guessedLetters.has(slot.letter)
                  ? 'text-red-400 border-red-400'
                  : 'text-white border-green-400'
                : 'border-white/30'
            }`}>
              {slot.revealed ? slot.letter : ''}
            </div>
          ))}
        </div>

        {/* Round result overlay */}
        {roundPhase !== 'playing' && (
          <div className="text-center mb-4">
            <div className={`text-2xl font-black mb-2 ${roundPhase === 'won' ? 'text-green-400' : 'text-red-400'}`}>
              {roundPhase === 'won' ? '🎉 Correct!' : `💀 The word was: ${currentWord.word}`}
            </div>
            <button onClick={nextRound}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg">
              {currentRound + 1 >= ROUNDS_PER_GAME ? 'See Results 🏆' : 'Next Word →'}
            </button>
          </div>
        )}

        {/* Keyboard */}
        {roundPhase === 'playing' && (
          <div className="bg-white/5 backdrop-blur rounded-2xl p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {ALPHABET.map((letter) => {
                const guessed = guessedLetters.has(letter)
                const isCorrect = guessed && currentWord.word.includes(letter)
                const isWrong = guessed && !currentWord.word.includes(letter)
                return (
                  <button key={letter} onClick={() => guessLetter(letter)} disabled={guessed}
                    className={`w-9 h-10 md:w-10 md:h-11 rounded-lg font-bold text-sm md:text-base transition-all ${
                      isCorrect ? 'bg-green-500 text-white' :
                      isWrong ? 'bg-red-500/50 text-white/50' :
                      'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
                    } ${guessed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {gamePhase === 'completed' && scoreBreakdown && (
        <ScoreBreakdownModal isOpen={true} onClose={() => navigate(ROUTES.HUB)} scoreBreakdown={scoreBreakdown}
          leaderboardRank={leaderboardRank} onPlayAgain={() => navigate(ROUTES.HANGMAN_SETUP)} gameType="HANGMAN" />
      )}
      {gamePhase === 'submitting' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center"><div className="text-4xl mb-4 animate-bounce">🪢</div><p className="text-xl font-bold">Calculating score...</p></div>
        </div>
      )}
    </div>
  )
}
