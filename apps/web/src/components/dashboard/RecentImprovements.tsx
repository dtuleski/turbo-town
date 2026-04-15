import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getUserScoreHistory, LeaderboardEntry, GameType } from '@/api/leaderboard'
import { ROUTES } from '@/config/constants'

interface Improvement {
  gameType: GameType
  improvement: number
  previousScore: number
  currentScore: number
  icon: string
  name: string
}

const gameTypeInfo: Record<GameType, { icon: string; name: string }> = {
  [GameType.MEMORY_MATCH]: { icon: '🃏', name: 'Memory Match' },
  [GameType.MATH_CHALLENGE]: { icon: '🧮', name: 'Math Challenge' },
  [GameType.WORD_PUZZLE]: { icon: '🔤', name: 'Word Puzzle' },
  [GameType.LANGUAGE_LEARNING]: { icon: '🌍', name: 'Language' },
  [GameType.SUDOKU]: { icon: '9️⃣', name: 'Sudoku' },
  [GameType.JIGSAW_PUZZLE]: { icon: '🧩', name: 'Jigsaw Puzzle' },
  [GameType.BUBBLE_POP]: { icon: '🫧', name: 'Bubble Pop' },
  [GameType.SEQUENCE_MEMORY]: { icon: '🧠', name: 'Sequence Memory' },
  [GameType.CODE_A_BOT]: { icon: '🤖', name: 'Code-a-Bot' },
  [GameType.GEO_QUIZ]: { icon: '🌍', name: 'Geo Quiz' },
  [GameType.HISTORY_QUIZ]: { icon: '📜', name: 'History Quiz' },
  [GameType.CIVICS_QUIZ]: { icon: '🇺🇸', name: 'Civics Quiz' },
  [GameType.COLOR_BY_NUMBER]: { icon: '🎨', name: 'Color by Number' },
  [GameType.HANGMAN]: { icon: '🪢', name: 'Hangman' },
  [GameType.TIC_TAC_TOE]: { icon: '❌', name: 'Tic Tac Toe' },
  [GameType.MATH_MAZE]: { icon: '🧮', name: 'Math Maze' },
  [GameType.OVERALL]: { icon: '🏆', name: 'Overall' },
}

const RecentImprovements = () => {
  const [improvements, setImprovements] = useState<Improvement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchImprovements = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const history = await getUserScoreHistory(undefined, 20)

        // Group by game type and find improvements
        const gameTypeGroups = new Map<GameType, LeaderboardEntry[]>()
        history.forEach((entry) => {
          if (!gameTypeGroups.has(entry.gameType)) {
            gameTypeGroups.set(entry.gameType, [])
          }
          gameTypeGroups.get(entry.gameType)!.push(entry)
        })

        const foundImprovements: Improvement[] = []

        gameTypeGroups.forEach((entries, gameType) => {
          if (entries.length >= 2) {
            // Sort by timestamp (most recent first)
            entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

            const recent = entries[0]
            const previous = entries[1]

            if (recent.score > previous.score) {
              const improvement = ((recent.score - previous.score) / previous.score) * 100
              foundImprovements.push({
                gameType,
                improvement,
                previousScore: previous.score,
                currentScore: recent.score,
                icon: gameTypeInfo[gameType].icon,
                name: gameTypeInfo[gameType].name,
              })
            }
          }
        })

        // Sort by improvement percentage
        foundImprovements.sort((a, b) => b.improvement - a.improvement)
        setImprovements(foundImprovements.slice(0, 3))
      } catch (err) {
        console.error('Failed to fetch improvements:', err)
        setError('Unable to load improvements')
      } finally {
        setIsLoading(false)
      }
    }

    fetchImprovements()
  }, [])

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error || improvements.length === 0) {
    return (
      <Link to={ROUTES.LEADERBOARD} className="card-hover">
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-bold mb-2">Recent Improvements</h3>
          <p className="text-text-secondary text-sm mb-3">
            {error || 'Keep playing to track your progress!'}
          </p>
          <span className="text-primary text-sm font-medium">
            View Stats →
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link to={ROUTES.LEADERBOARD} className="card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Recent Improvements</h3>
        <span className="text-2xl">🎯</span>
      </div>

      <div className="space-y-3">
        {improvements.map((improvement, index) => (
          <div
            key={`${improvement.gameType}-${index}`}
            className="flex items-center justify-between p-3 bg-card-hover rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{improvement.icon}</span>
              <div>
                <div className="font-medium text-sm">{improvement.name}</div>
                <div className="text-xs text-text-secondary">
                  {improvement.previousScore.toLocaleString()} → {improvement.currentScore.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-500 font-bold text-sm">
                +{improvement.improvement.toFixed(0)}%
              </div>
              <div className="text-xs text-text-secondary">better</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 mt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-500">
            Great progress! 🌟
          </span>
          <span className="text-primary text-sm font-medium">
            View All →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default RecentImprovements
