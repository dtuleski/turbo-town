import { useState, useEffect, useCallback } from 'react'
import type { GameState, GameTheme, DifficultyLevel, Card } from '@/types/game'
import { generateCards, checkMatch, isGameComplete, calculateScore } from '@/utils/gameLogic'
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
    if (gameState.status === 'COMPLETED' && gameId) {
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
        } catch (error) {
          console.error('Failed to save game:', error)
          // Log more details
          if (error instanceof Error) {
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
          }
        }
      }
      saveGame()
    }
  }, [gameState.status, gameState.elapsedTime, gameState.attempts, gameId])

  // Start game
  const startGame = useCallback(async () => {
    try {
      // Map difficulty to 1-5 scale
      const difficultyMap: Record<DifficultyLevel, number> = {
        EASY: 1,
        MEDIUM: 3,
        HARD: 5,
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
    } catch (error) {
      console.error('Failed to start game:', error)
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

        setTimeout(() => {
          const [firstCard] = flippedCards
          const isMatch = checkMatch(firstCard, card)

          if (isMatch) {
            // Match found!
            const matchedCards = newCards.map(c =>
              c.value === card.value ? { ...c, isMatched: true } : c
            )

            setGameState(prev => {
              const newMatches = prev.matches + 1
              const newAttempts = prev.attempts + 1
              const allMatched = isGameComplete(matchedCards)

              if (allMatched) {
                const endTime = Date.now()
                const timeSeconds = Math.floor((endTime - (prev.startTime || endTime)) / 1000)
                const finalScore = calculateScore(newAttempts, timeSeconds, difficulty)

                return {
                  ...prev,
                  cards: matchedCards,
                  matches: newMatches,
                  attempts: newAttempts,
                  score: finalScore,
                  status: 'COMPLETED',
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
            // No match - flip cards back
            const unflippedCards = newCards.map(c =>
              c.id === firstCard.id || c.id === card.id ? { ...c, isFlipped: false } : c
            )

            setGameState(prev => ({
              ...prev,
              cards: unflippedCards,
              attempts: prev.attempts + 1,
            }))
          }

          setFlippedCards([])
          setIsChecking(false)
        }, 1000)
      }
    },
    [gameState, flippedCards, isChecking, difficulty]
  )

  return {
    gameState,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    handleCardClick,
  }
}
