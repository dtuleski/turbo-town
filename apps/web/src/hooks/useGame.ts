import { useState, useEffect, useCallback } from 'react'
import type { GameState, GameTheme, DifficultyLevel, Card } from '@/types/game'
import { generateCards, checkMatch, isGameComplete } from '@/utils/gameLogic'
import { startGame as startGameAPI, completeGame as completeGameAPI } from '@/api/game'

export const useGame = (theme: GameTheme, difficulty: DifficultyLevel) => {
  const [gameState, setGameState] = useState<GameState>({
    theme,
    difficulty,
    cards: generateCards(theme, difficulty),
    status: 'NOT_STARTED',
    attempts: 0,
    matches: 0,
    score: 0,
    startTime: null,
    endTime: null,
    elapsedTime: 0,
  })

  const [flippedCards, setFlippedCards] = useState<Card[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [gameId, setGameId] = useState<string | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null)
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [gameGeneration, setGameGeneration] = useState(0)

  // Timer effect
  useEffect(() => {
    if (gameState.status !== 'IN_PROGRESS') return

    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        elapsedTime: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000),
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState.status])

  // Game completion effect - save to backend
  useEffect(() => {
    // Check if all cards are matched but status is still IN_PROGRESS
    const allMatched = gameState.cards.every(c => c.isMatched)
    const needsCompletion = allMatched && gameState.status === 'IN_PROGRESS' && gameId && gameState.endTime
    
    if (needsCompletion) {
      const saveGame = async () => {
        try {
          console.log('Saving game to backend...', {
            gameId,
            completionTime: gameState.elapsedTime,
            attempts: gameState.attempts,
          })
          
          const result = await completeGameAPI({
            gameId,
            completionTime: gameState.elapsedTime,
            attempts: gameState.attempts,
          })
          
          console.log('Game saved successfully!', result)
          
          // CRITICAL: Update game state with backend score AND set status to COMPLETED
          // This ensures the modal shows the correct score
          setGameState(prev => ({
            ...prev,
            score: result.score || 0,
            status: 'COMPLETED', // Now set to COMPLETED with correct score
          }))
          
          // Capture score breakdown and leaderboard rank
          if (result.scoreBreakdown) {
            setScoreBreakdown(result.scoreBreakdown)
          }
          if (result.leaderboardRank) {
            setLeaderboardRank(result.leaderboardRank)
          }
        } catch (error) {
          console.error('Failed to save game:', error)
          // Log more details
          if (error instanceof Error) {
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
          }
          // Even if backend fails, mark as completed with frontend score
          setGameState(prev => ({
            ...prev,
            status: 'COMPLETED',
          }))
        }
      }
      saveGame()
    }
  }, [gameState.cards, gameState.status, gameState.elapsedTime, gameState.attempts, gameState.endTime, gameId])

  // Start game
  const startGame = useCallback(async () => {
    try {
      // Map difficulty to 1-4 scale
      const difficultyMap: Record<DifficultyLevel, number> = {
        EASY: 1,
        MEDIUM: 2,
        HARD: 3,
        SUPER_HARD: 4,
      }

      console.log('Starting game...', {
        themeId: theme,
        difficulty: difficultyMap[difficulty],
      })

      // Call backend API to start game
      const response = await startGameAPI({
        themeId: theme,
        difficulty: difficultyMap[difficulty],
      })

      console.log('Game started successfully!', response)
      setGameId(response.id)
      
      setGameState(prev => ({
        ...prev,
        status: 'IN_PROGRESS',
        startTime: Date.now(),
      }))
    } catch (error: any) {
      console.error('Failed to start game:', error)
      // Check if it's a rate limit error
      if (error?.message?.includes('Rate limit') || error?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED') {
        // Redirect to rate limit page
        window.location.href = '/rate-limit?rateLimited=true'
        return
      }
      // Log more details
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      // Still allow playing even if API fails
      setGameState(prev => ({
        ...prev,
        status: 'IN_PROGRESS',
        startTime: Date.now(),
      }))
    }
  }, [theme, difficulty])

  // Pause game
  const pauseGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'PAUSED',
    }))
  }, [])

  // Resume game
  const resumeGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'IN_PROGRESS',
    }))
  }, [])

  // Restart game
  const restartGame = useCallback(() => {
    setGameGeneration(prev => prev + 1)
    setGameState({
      theme,
      difficulty,
      cards: generateCards(theme, difficulty),
      status: 'NOT_STARTED',
      attempts: 0,
      matches: 0,
      score: 0,
      startTime: null,
      endTime: null,
      elapsedTime: 0,
    })
    setFlippedCards([])
    setIsChecking(false)
    setGameId(null)
    setScoreBreakdown(null)
    setLeaderboardRank(null)
  }, [theme, difficulty])

  // Handle card click
  const handleCardClick = useCallback(
    (card: Card) => {
      // Ignore clicks if game not started, checking, card already flipped, or card matched
      if (
        gameState.status !== 'IN_PROGRESS' ||
        isChecking ||
        card.isFlipped ||
        card.isMatched ||
        flippedCards.length >= 2
      ) {
        return
      }

      // Flip the card
      const newCards = gameState.cards.map(c =>
        c.id === card.id ? { ...c, isFlipped: true } : c
      )

      setGameState(prev => ({ ...prev, cards: newCards }))
      setFlippedCards(prev => [...prev, card])

      // If this is the second card, check for match
      if (flippedCards.length === 1) {
        setIsChecking(true)
        const currentGeneration = gameGeneration

        setTimeout(() => {
          // Bail out if game was restarted while we were waiting
          setGameGeneration(gen => {
            if (gen !== currentGeneration) return gen
            
            const [firstCard] = flippedCards
            const isMatch = checkMatch(firstCard, card)

            if (isMatch) {
              const matchedCards = newCards.map(c =>
                c.id === firstCard.id || c.id === card.id ? { ...c, isMatched: true } : c
              )

              setGameState(prev => {
                if (prev.status !== 'IN_PROGRESS') return prev
                const newMatches = prev.matches + 1
                const newAttempts = prev.attempts + 1
                const allMatched = isGameComplete(matchedCards)

                if (allMatched) {
                  const endTime = Date.now()
                  return {
                    ...prev,
                    cards: matchedCards,
                    matches: newMatches,
                    attempts: newAttempts,
                    score: 0,
                    status: 'IN_PROGRESS',
                    endTime,
                  }
                }

                return {
                  ...prev,
                  cards: matchedCards,
                  matches: newMatches,
                  attempts: newAttempts,
                }
              })
            } else {
              setGameState(prev => {
                if (prev.status !== 'IN_PROGRESS') return prev
                const unflippedCards = prev.cards.map(c =>
                  c.id === firstCard.id || c.id === card.id ? { ...c, isFlipped: false } : c
                )
                return {
                  ...prev,
                  cards: unflippedCards,
                  attempts: prev.attempts + 1,
                }
              })
            }

            setFlippedCards([])
            setIsChecking(false)
            return gen
          })
        }, 1000)
      }
    },
    [gameState, flippedCards, isChecking, difficulty, gameGeneration]
  )

  return {
    gameState,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    handleCardClick,
    scoreBreakdown,
    leaderboardRank,
  }
}
