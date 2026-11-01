import { useTranslation } from 'react-i18next'
import type { QuestRateLimitView } from '@/types/quest'

const formatTime = (iso: string): string | null => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Daily plays used / limit, shared by the map header and the node panel. */
export default function PlaysLeftBar({ rateLimit }: { rateLimit: QuestRateLimitView }) {
  const { t } = useTranslation()
  const limit = Math.max(0, rateLimit.limit)
  const used = Math.min(limit, Math.max(0, rateLimit.used))
  const remaining = Math.max(0, rateLimit.remaining)
  const percent = limit > 0 ? Math.round((used / limit) * 100) : 0
  const reset = formatTime(rateLimit.resetAt)
  const label = t('quest.playsLeft', { count: remaining })

  return (
    <div className="w-full max-w-xs">
      <p className="text-sm font-semibold text-cyan-100">{label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-valuetext={t('quest.playsUsed', { used, limit })}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-700"
      >
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-300">
        {t('quest.playsUsed', { used, limit })}
        {reset !== null && <> · {t('quest.resetsAt', { time: reset })}</>}
      </p>
    </div>
  )
}
