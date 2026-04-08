import { LeaderboardEntry } from '@/api/leaderboard'
import clsx from 'clsx'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
}

const getRankIcon = (rank: number): string => {
  switch (rank) {
    case 1:
      return '🥇'
    case 2:
      return '🥈'
    case 3:
      return '🥉'
    default:
      return ''
  }
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

const formatAccuracy = (accuracy: number): string => {
  return `${(accuracy * 100).toFixed(0)}%`
}

const LeaderboardRow = ({ entry }: LeaderboardRowProps) => {
  return (
    <tr
      className={clsx(
        'border-b border-border transition-colors',
        entry.isCurrentUser
          ? 'bg-primary/10 hover:bg-primary/20'
          : 'hover:bg-card-hover'
      )}
    >
      <td className="px-4 py-3 text-center font-bold">
        <div className="flex items-center justify-center gap-2">
          {getRankIcon(entry.rank)}
          <span className={clsx(
            entry.rank <= 3 && 'text-primary',
            entry.isCurrentUser && 'text-primary font-extrabold'
          )}>
            {entry.rank}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'font-medium',
            entry.isCurrentUser && 'text-primary font-bold'
          )}>
            {entry.username}
          </span>
          {entry.isCurrentUser && (
            <span className="px-2 py-0.5 text-xs bg-primary text-white rounded-full">
              You
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center font-bold text-primary">
        {entry.score.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center text-text-secondary hidden md:table-cell">
        {formatTime(entry.completionTime)}
      </td>
      <td className="px-4 py-3 text-center text-text-secondary hidden md:table-cell">
        {formatAccuracy(entry.accuracy)}
      </td>
      <td className="px-4 py-3 text-center text-text-secondary text-sm hidden xl:table-cell">
        {new Date(entry.timestamp).toLocaleDateString()}
      </td>
    </tr>
  )
}

export default LeaderboardRow
