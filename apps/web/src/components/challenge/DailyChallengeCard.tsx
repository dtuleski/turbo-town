import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getChallengeLeaderboard, getDailyChallenge } from '@/api/challenge'
import { ROUTES } from '@/config/constants'
import { buildChallengeUrl } from '@/utils/challengeLaunch'
import type { ChallengeLeaderboardView, DailyChallengeView } from '@/types/challenge'

/** How many leaderboard rows the card shows. */
export const CARD_TOP_COUNT = 5

export interface DailyChallengeCardData {
  challenge: DailyChallengeView
  /** Today's leaderboard; null when it failed to load (the card still shows the challenge). */
  leaderboard: ChallengeLeaderboardView | null
}

/** Today's challenge and its top 5; null when the challenge is off or fails to load. Never throws. */
export async function loadDailyChallengeCard(): Promise<DailyChallengeCardData | null> {
  try {
    const [challenge, leaderboard] = await Promise.all([
      getDailyChallenge(),
      getChallengeLeaderboard(undefined, CARD_TOP_COUNT).catch(() => null),
    ])
    if (!challenge) return null
    return { challenge, leaderboard: leaderboard && leaderboard.day === challenge.day ? leaderboard : null }
  } catch {
    return null
  }
}

export const resultsUrl = (day: string): string => `${ROUTES.CHALLENGE_RESULTS}?day=${encodeURIComponent(day)}`

/** The hub's `challengeFailed=1` flag, set when a challenge start or challenge content failed (DC3). */
export const hasChallengeFailedFlag = (search: string): boolean => new URLSearchParams(search).get('challengeFailed') === '1'

export interface DailyChallengeCardViewProps {
  data: DailyChallengeCardData | null
  failed: boolean
}

/** Card markup (W5). Renders nothing without data, apart from the failed-start notice. */
export function DailyChallengeCardView({ data, failed }: DailyChallengeCardViewProps) {
  const { t } = useTranslation()
  if (!data && !failed) return null
  const notice = failed ? (
    <p role="status" className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      {t('challenge.card.failed')}
    </p>
  ) : null
  if (!data) return notice
  const { challenge, leaderboard } = data
  const playUrl = buildChallengeUrl(challenge)
  const top = leaderboard ? leaderboard.entries.slice(0, CARD_TOP_COUNT) : null
  return (
    <>
      {notice}
      <section
        aria-labelledby="daily-challenge-card-title"
        data-testid="daily-challenge-card"
        className="mb-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-100 p-4 text-slate-800 shadow-md"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="daily-challenge-card-title" className="text-lg font-black text-orange-800">
              <span aria-hidden="true">⭐ </span>
              {t('challenge.card.title')}
            </h2>
            <p className="text-xl font-bold text-slate-900">{t(`challenge.games.${challenge.gameId}`)}</p>
            <p className="text-sm text-slate-700">
              {challenge.me
                ? t('challenge.card.best', { score: challenge.me.bestScore, rank: challenge.me.rank })
                : t('challenge.card.notPlayed')}
            </p>
            <p className="text-xs text-slate-600">{t('challenge.card.endsAt')}</p>
          </div>
          {playUrl && (
            <Link
              to={playUrl}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-orange-700 bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-orange-800"
            >
              {t('challenge.card.play')}
            </Link>
          )}
        </div>
        {top && (
          <div className="mt-3">
            <h3 className="text-sm font-bold text-orange-900">{t('challenge.card.top')}</h3>
            {top.length === 0 ? (
              <p className="text-sm text-slate-700">{t('challenge.card.noScores')}</p>
            ) : (
              <ol className="mt-1 space-y-1 text-sm">
                {top.map((entry) => (
                  <li
                    key={`${entry.rank}-${entry.username}`}
                    className={`flex justify-between gap-2 rounded-lg px-2 py-1 ${entry.isMe ? 'bg-orange-200 font-bold' : 'bg-white/60'}`}
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
          </div>
        )}
        <Link
          to={resultsUrl(challenge.day)}
          className="mt-3 inline-block text-sm font-semibold text-orange-800 underline hover:text-orange-900"
        >
          {t('challenge.card.allResults')}
        </Link>
      </section>
    </>
  )
}

/**
 * Daily Challenge card at the top of the hub (W5, FR-DC-21): game, Play, own best and rank, today's top
 * 5. Hidden while loading, when the challenge is off and when it fails to load.
 */
export default function DailyChallengeCard() {
  const location = useLocation()
  const [data, setData] = useState<DailyChallengeCardData | null>(null)
  useEffect(() => {
    let cancelled = false
    loadDailyChallengeCard().then((loaded) => {
      if (!cancelled) setData(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return <DailyChallengeCardView data={data} failed={hasChallengeFailedFlag(location.search)} />
}
