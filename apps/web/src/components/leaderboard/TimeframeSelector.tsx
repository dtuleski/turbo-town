import { Timeframe } from '@/api/leaderboard'
import clsx from 'clsx'

interface TimeframeSelectorProps {
  selected: Timeframe
  onChange: (timeframe: Timeframe) => void
}

const timeframes = [
  { value: Timeframe.DAILY, label: 'Daily', icon: '📅' },
  { value: Timeframe.WEEKLY, label: 'Weekly', icon: '📆' },
  { value: Timeframe.MONTHLY, label: 'Monthly', icon: '🗓️' },
  { value: Timeframe.ALL_TIME, label: 'All Time', icon: '🏆' },
]

const TimeframeSelector = ({ selected, onChange }: TimeframeSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe.value}
          onClick={() => onChange(timeframe.value)}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'flex items-center gap-2',
            selected === timeframe.value
              ? 'bg-primary text-white shadow-lg scale-105'
              : 'bg-card hover:bg-card-hover text-text-primary'
          )}
        >
          <span>{timeframe.icon}</span>
          <span>{timeframe.label}</span>
        </button>
      ))}
    </div>
  )
}

export default TimeframeSelector
