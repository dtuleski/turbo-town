import { gql } from '@apollo/client'
import { gameClient } from './client'
import type { ChallengeLeaderboardView, DailyChallengeView } from '@/types/challenge'

const GET_DAILY_CHALLENGE = gql`
  query GetDailyChallenge {
    getDailyChallenge {
      day
      gameId
      themeId
      difficulty
      settings
      content
      endsAt
      me {
        bestScore
        rank
        achievedAt
      }
    }
  }
`

const GET_CHALLENGE_LEADERBOARD = gql`
  query GetChallengeLeaderboard($day: String, $limit: Int) {
    getChallengeLeaderboard(day: $day, limit: $limit) {
      day
      gameId
      themeId
      final
      entries {
        rank
        username
        score
        achievedAt
        isMe
      }
      me {
        bestScore
        rank
        achievedAt
      }
    }
  }
`

/** Parses the JSON text fields; null when they are not objects or the content is not for the game. */
export function parseDailyChallenge(raw: unknown): DailyChallengeView | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.settings !== 'string' || typeof r.content !== 'string' || typeof r.gameId !== 'string') return null
  let settings: unknown
  let content: unknown
  try {
    settings = JSON.parse(r.settings)
    content = JSON.parse(r.content)
  } catch {
    return null
  }
  if (!settings || typeof settings !== 'object' || !content || typeof content !== 'object') return null
  if ((content as { kind?: unknown }).kind !== r.gameId) return null
  return { ...(r as unknown as DailyChallengeView), settings: settings as DailyChallengeView['settings'], content: content as DailyChallengeView['content'] }
}

/** Today's challenge, or null when the feature is off or anything fails. */
export const getDailyChallenge = async (): Promise<DailyChallengeView | null> => {
  try {
    const { data } = await gameClient.query({
      query: GET_DAILY_CHALLENGE,
      fetchPolicy: 'network-only',
    })
    return parseDailyChallenge(data?.getDailyChallenge)
  } catch {
    console.error('Daily challenge could not be loaded')
    return null
  }
}

/** A day's leaderboard (today when `day` is absent), or null when off or on any error. */
export const getChallengeLeaderboard = async (day?: string, limit?: number): Promise<ChallengeLeaderboardView | null> => {
  try {
    const { data } = await gameClient.query({
      query: GET_CHALLENGE_LEADERBOARD,
      variables: { day, limit },
      fetchPolicy: 'network-only',
    })
    return data?.getChallengeLeaderboard ?? null
  } catch {
    console.error('Challenge leaderboard could not be loaded')
    return null
  }
}
