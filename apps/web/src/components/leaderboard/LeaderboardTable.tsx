import { LeaderboardEntry } from '@/api/leaderboard'
import LeaderboardRow from './LeaderboardRow'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  isLoading: boolean
}

const LeaderboardTable = ({ entries, isLoading }: LeaderboardTableProps) => {
  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-bold mb-2">No Entries Yet</h3>
          <p className="text-text-secondary">
            Be the first to play and claim the top spot!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-card-hover">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">
                Rank
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">
                Player
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary">
                Score
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary hidden md:table-cell">
                Time
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary hidden md:table-cell">
                Accuracy
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text-secondary hidden xl:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <LeaderboardRow key={`${entry.userId}-${entry.timestamp}`} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LeaderboardTable
