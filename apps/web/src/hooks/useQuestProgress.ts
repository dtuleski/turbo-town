import { useCallback, useEffect, useRef, useState } from 'react'
import { getQuestProgress } from '@/api/quest'
import type { QuestProgressView } from '@/types/quest'

export interface QuestProgressState {
  data: QuestProgressView | null
  loading: boolean
  error: boolean
  refetch: () => void
}

/**
 * Loads the player's Quest Map view (network-only, so every visit shows current data). While
 * loading no stale data is shown. Errors log a status only, never the payload.
 */
export function useQuestProgress(): QuestProgressState {
  const [data, setData] = useState<QuestProgressView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(false)
    setData(null)
    getQuestProgress()
      .then((view) => {
        if (id !== requestId.current) return
        setData(view)
        setLoading(false)
      })
      .catch(() => {
        if (id !== requestId.current) return
        console.error('Quest progress request failed')
        setError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
    return () => {
      requestId.current += 1
    }
  }, [load])

  return { data, loading, error, refetch: load }
}
