import { gql } from '@apollo/client'
import { gameClient } from './client'
import type { QuestProgressView } from '@/types/quest'

// `catalogGameId` is never selected: the server does not send it and the web never shows it.
const GET_QUEST_PROGRESS = gql`
  query GetQuestProgress {
    getQuestProgress {
      tier
      rateLimit {
        limit
        used
        remaining
        resetAt
      }
      worlds {
        id
        order
        accessible
        totalStars
        maxStars
        badges
        activeGauntlet {
          nodeId
          legsDone
          legsTotal
          expiresAt
        }
        nodes {
          id
          kind
          status
          stars
          bestScore
          thresholds
          map {
            x
            y
          }
          legs {
            themeId
            difficulty
            params {
              levelId
              pageTheme
            }
          }
        }
      }
    }
  }
`

export const getQuestProgress = async (): Promise<QuestProgressView> => {
  const { data } = await gameClient.query({
    query: GET_QUEST_PROGRESS,
    fetchPolicy: 'network-only',
  })
  return data.getQuestProgress
}
