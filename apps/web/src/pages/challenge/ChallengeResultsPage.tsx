import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getChallengeLeaderboard } from '@/api/challenge'
import { ROUTES } from '@/config/constants'
import { isChallengeDay } from '@/utils/challengeShared'
import type { ChallengeLeaderboardView } from '@/types/challenge'

/** How many rows the results page shows. */
export const RESULTS_COUNT = 10

/** The `day` query parameter when it is a real calendar day; otherwise undefined (today). */
export function resultsDay(search: string): string | undefined {
  try {
    const raw = new URLSearchParams(search).get('day')
    return raw !== null && isChallengeDay(raw) ? raw : undefined
  } catch {
    return undefined
  }
}

/** A challenge day as a long date in the UI language (the day is a calendar date, not an instant). */
export function formatChallengeDay(day: string, language: string): string {
  try {
    return new Date(`${day}T12:00:00Z`).toLocaleDateString(language, { timeZone: 'UTC', dateStyle: 'long' })
  } catch {
    return day
  }
}

export interface ChallengeResultsViewProps {
  loading: boolean
  data: ChallengeLeaderboardView | null
}

/** Results markup (W6): the day's game, winner, top 10 and own rank. */
export function ChallengeResultsView({ loading, data }: ChallengeResultsViewProps) {
  const { t, i18n } = useTranslation()
  const winner = data?.entries[0]
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-3xl font-black">{t('challenge.results.title')}</h1>
      {loading ? (
        <p className="text-text-secondary">{t('challenge.results.loading')}</p>
      ) : !data ? (
        <p className="text-text-secondary">{t('challenge.results.none')}</p>
      ) : (
        <div className="card space-y-4">
          <div>
            <p className="text-sm text-text-secondary">{formatChallengeDay(data.day, i18n.language)}</p>
            <h2 className="text-2xl font-bold">{t(`challenge.games.${data.gameId}`)}</h2>
            {!data.final && <p className="text-sm text-text-secondary">{t('challenge.results.live')}</p>}
          </div>
          {winner ? (
            <p className="text-lg font-semibold">
              <span aria-hidden="true">🏆 </span>
              {t('challenge.results.winner', { username: winner.username, score: winner.score })}
            </p>
          ) : (
            <p>{t('challenge.results.noScores')}</p>
          )}
          {data.entries.length > 0 && (
            <ol className="space-y-1">
              {data.entries.slice(0, RESULTS_COUNT).map((entry) => (
                <li
                  key={`${entry.rank}-${entry.username}`}
                  className={`flex justify-between gap-2 rounded-lg px-3 py-2 ${entry.isMe ? 'bg-amber-100 font-bold' : 'bg-gray-50'}`}
                >
                  <span>
                    #{entry.rank} {entry.username}
                    {entry.isMe ? ` ${t('challenge.you')}` : ''}
                  </span>
                  <span>{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="font-medium">
            {data.me
              ? t('challenge.results.me', { rank: data.me.rank, score: data.me.bestScore })
              : t('challenge.results.notPlayed')}
          </p>
        </div>
      )}
      <Link to={ROUTES.HUB} className="mt-6 inline-block font-semibold text-primary underline">
        {t('challenge.results.toHub')}
      </Link>
    </div>
  )
}

/** `/challenge/results?day=YYYY-MM-DD` (the digest email link); today when the day is missing. */
export default function ChallengeResultsPage() {
  const location = useLocation()
  const day = resultsDay(location.search)
  const [state, setState] = useState<ChallengeResultsViewProps>({ loading: true, data: null })
  useEffect(() => {
    let cancelled = false
    setState({ loading: true, data: null })
    getChallengeLeaderboard(day, RESULTS_COUNT).then((data) => {
      if (!cancelled) setState({ loading: false, data })
    })
    return () => {
      cancelled = true
    }
  }, [day])
  return <ChallengeResultsView {...state} />
}
