import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { ROUTES } from '@/config/constants'
import { useQuestProgress } from '@/hooks/useQuestProgress'
import type { QuestNodeView, QuestProgressView } from '@/types/quest'
import { getFrontierNodeId, resolveStartFailed } from '@/utils/questMap'
import { questResultStore } from '@/utils/questResultStore'
import PlaysLeftBar from '@/components/quest/PlaysLeftBar'
import QuestNodePanel from '@/components/quest/QuestNodePanel'
import QuestWorldPath from '@/components/quest/QuestWorldPath'
import { worldName } from '@/components/quest/questText'

export interface QuestSelection {
  worldId: string
  nodeId: string
}

export interface QuestMapViewProps {
  data: QuestProgressView | null
  loading: boolean
  error: boolean
  onRetry: () => void
  notice: string | null
  selected: QuestSelection | null
  onSelect: (worldId: string, node: QuestNodeView, button: HTMLButtonElement) => void
  onClosePanel: () => void
  onPlay: (url: string) => void
  reducedMotion: boolean
  justUnlocked?: ReadonlySet<string>
}

const LINK =
  'inline-flex min-h-[44px] items-center rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300'

/** Presentational Quest Map: everything the page shows, driven only by props. */
export function QuestMapView({
  data,
  loading,
  error,
  onRetry,
  notice,
  selected,
  onSelect,
  onClosePanel,
  onPlay,
  reducedMotion,
  justUnlocked,
}: QuestMapViewProps) {
  const { t } = useTranslation()
  const worlds = data ? [...data.worlds].sort((a, b) => a.order - b.order) : []
  const selectedWorld = selected ? worlds.find((world) => world.id === selected.worldId) : undefined
  const selectedNode = selected ? selectedWorld?.nodes.find((node) => node.id === selected.nodeId) : undefined

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-hidden rounded-2xl bg-slate-950 py-4 text-slate-100 sm:px-6">
      <header className="flex flex-col gap-3 px-3 sm:flex-row sm:items-end sm:justify-between sm:px-0">
        <div>
          <h1 className="text-2xl font-black text-white">{t('quest.title')}</h1>
          <p className="text-sm text-slate-300">{t('quest.subtitle')}</p>
        </div>
        {data && <PlaysLeftBar rateLimit={data.rateLimit} />}
      </header>

      <div role="status" className="px-3 sm:px-0">
        {notice && (
          <p className="mt-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-100">{notice}</p>
        )}
      </div>

      {loading && (
        <div aria-busy="true" className="mt-4 space-y-3 px-3 sm:px-0">
          <p className="text-sm text-slate-300">{t('quest.loading')}</p>
          <div className={`h-64 rounded-2xl bg-slate-800 ${reducedMotion ? '' : 'animate-pulse'}`} />
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 px-3 sm:px-0">
          <p className="text-sm text-amber-100">{t('quest.error.title')}</p>
          <button type="button" onClick={onRetry} className={`${LINK} border-amber-300 text-amber-100`}>
            {t('quest.error.retry')}
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        worlds.map((world) => (
          <section key={world.id} aria-labelledby={`quest-world-${world.id}`} className="mt-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-3 sm:px-0">
              <h2 id={`quest-world-${world.id}`} className="text-xl font-bold text-cyan-100">
                {worldName(t, world.id)}
              </h2>
              <p className="text-sm text-amber-200">
                <span aria-hidden="true">★ </span>
                {t('quest.worldStars', { stars: world.totalStars, max: world.maxStars })}
              </p>
            </div>
            {!world.accessible && (
              <div className="mb-3 flex flex-wrap items-center gap-3 px-3 sm:px-0">
                <span className="rounded bg-slate-700 px-2 py-1 text-sm font-semibold text-slate-100">
                  <span aria-hidden="true">🔒 </span>
                  {t('quest.worldLocked.label')}
                </span>
                <Link to={ROUTES.SUBSCRIPTION} className={`${LINK} border-amber-300 bg-amber-400 text-slate-950`}>
                  {t('quest.worldLocked.link')}
                </Link>
              </div>
            )}
            <QuestWorldPath
              world={world}
              reducedMotion={reducedMotion}
              justUnlocked={justUnlocked}
              onSelect={(node, button) => onSelect(world.id, node, button)}
            />
          </section>
        ))}

      {data && selectedWorld && selectedNode && (
        <QuestNodePanel
          node={selectedNode}
          world={selectedWorld}
          rateLimit={data.rateLimit}
          onClose={onClosePanel}
          onPlay={onPlay}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  )
}

/** Route ROUTES.QUEST_MAP: wires data, URL handling, focus and scroll to QuestMapView. */
export default function QuestMapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = useReducedMotion() ?? false
  const { data, loading, error, refetch } = useQuestProgress()
  const [notice, setNotice] = useState<string | null>(null)
  const [selected, setSelected] = useState<QuestSelection | null>(null)
  const lastButton = useRef<HTMLButtonElement | null>(null)
  const scrolled = useRef(false)
  // Unlocks from the game just finished play once, then the store is cleared.
  const [justUnlocked] = useState<ReadonlySet<string>>(
    () => new Set(questResultStore.get()?.newlyUnlocked ?? [])
  )

  useEffect(() => {
    questResultStore.clear()
  }, [])

  // `?startFailed=` is read once on mount and removed from the URL (R1 return path).
  const initialSearch = useRef(location.search)
  useEffect(() => {
    const search = initialSearch.current
    if (!new URLSearchParams(search).has('startFailed')) return
    const reason = resolveStartFailed(search)
    if (reason === 'rate') {
      navigate(ROUTES.RATE_LIMIT, { state: { rateLimited: true }, replace: true })
      return
    }
    navigate(ROUTES.QUEST_MAP, { replace: true })
    if (reason === 'quest') {
      setNotice(t('quest.notice.questUnavailable'))
      refetch()
    }
  }, [navigate, refetch, t])

  // Bring the frontier node into view once the data arrives.
  useEffect(() => {
    if (!data || scrolled.current) return
    scrolled.current = true
    const world = [...data.worlds].sort((a, b) => a.order - b.order).find((w) => getFrontierNodeId(w) !== null)
    const id = world ? getFrontierNodeId(world) : null
    if (id === null) return
    const element = document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)
    element?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [data, reducedMotion])

  const onSelect = useCallback((worldId: string, node: QuestNodeView, button: HTMLButtonElement) => {
    lastButton.current = button
    setSelected({ worldId, nodeId: node.id })
  }, [])

  const onClosePanel = useCallback(() => {
    setSelected(null)
    lastButton.current?.focus()
  }, [])

  const onPlay = useCallback((url: string) => navigate(url), [navigate])

  return (
    <QuestMapView
      data={data}
      loading={loading}
      error={error}
      onRetry={refetch}
      notice={notice}
      selected={selected}
      onSelect={onSelect}
      onClosePanel={onClosePanel}
      onPlay={onPlay}
      reducedMotion={reducedMotion}
      justUnlocked={justUnlocked}
    />
  )
}
