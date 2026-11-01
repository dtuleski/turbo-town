import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import type { QuestNodeView, QuestRateLimitView, QuestWorldView } from '@/types/quest'
import { getGameNameKey } from '@/utils/questLaunch'
import { getPanelForm, getPlayLabelKey, getPlayUrl, getShownStars } from '@/utils/questMap'
import PlaysLeftBar from './PlaysLeftBar'
import { nodeName } from './questText'

const BUTTON =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300'

const formatTime = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export interface QuestNodePanelProps {
  node: QuestNodeView
  world: QuestWorldView
  rateLimit: QuestRateLimitView
  onClose: () => void
  onPlay: (url: string) => void
  reducedMotion: boolean
}

/**
 * Node details as a labelled dialog: bottom sheet on phones, side card from 640px. Focus moves to
 * the title on open; Escape and Close call onClose (the page returns focus to the node button).
 */
export default function QuestNodePanel({ node, world, rateLimit, onClose, onPlay, reducedMotion }: QuestNodePanelProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const form = getPanelForm(node, world)
  const stars = getShownStars(node)
  const isBoss = node.kind === 'BOSS'
  const run = world.activeGauntlet?.nodeId === node.id ? world.activeGauntlet : null
  const playUrl = form === 'play' ? getPlayUrl(node, world) : null

  useEffect(() => {
    titleRef.current?.focus()
  }, [node.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={`fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-cyan-500/40 bg-slate-900 p-4 text-slate-100 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-24 sm:w-96 sm:rounded-2xl ${
        reducedMotion ? '' : 'transition-transform'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-lg font-bold text-cyan-100 focus:outline-none">
            {nodeName(t, node.id)}
          </h2>
          {node.kind === 'BOSS' && (
            <span className="mt-1 inline-block rounded bg-rose-500/20 px-2 text-xs font-bold text-rose-100">{t('quest.node.boss')}</span>
          )}
          {node.kind === 'BONUS' && (
            <span className="mt-1 inline-block rounded bg-violet-500/20 px-2 text-xs font-bold text-violet-100">{t('quest.node.bonus')}</span>
          )}
        </div>
        <button type="button" onClick={onClose} className={`${BUTTON} border-slate-500 text-slate-200`}>
          {t('quest.panel.close')}
        </button>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-200">{t('quest.panel.legs')}</h3>
      <ol className="mt-1 space-y-1 text-sm">
        {node.legs.map((leg, index) => {
          const nameKey = getGameNameKey(leg.themeId)
          return (
            <li key={`${leg.themeId}-${index}`} className="flex flex-wrap gap-x-2">
              {node.legs.length > 1 && (
                <span className="text-slate-400">{t('quest.panel.legOf', { k: index + 1, n: node.legs.length })}:</span>
              )}
              <span>{nameKey ? t(nameKey) : leg.themeId}</span>
              <span className="text-slate-400">({t(`quest.difficulty.${leg.difficulty}`, { defaultValue: String(leg.difficulty) })})</span>
            </li>
          )
        })}
      </ol>
      {isBoss && node.legs.length > 1 && <p className="mt-1 text-xs text-slate-300">{t('quest.panel.order')}</p>}

      <h3 className="mt-3 text-sm font-semibold text-slate-200">
        {t('quest.panel.goals')}
        {isBoss && <span className="font-normal text-slate-400"> ({t('quest.panel.combinedScore')})</span>}
      </h3>
      <ul className="mt-1 space-y-1 text-sm">
        {node.thresholds.map((points, index) => {
          const reached = stars > index
          return (
            <li key={index} className="flex items-center gap-2">
              <span aria-hidden="true" className={reached ? 'text-amber-300' : 'text-slate-500'}>
                {reached ? '★' : '☆'}
              </span>
              <span>
                {t(`quest.panel.goal${index + 1}`)}: {t('quest.panel.points', { points: points.toLocaleString() })}
              </span>
              {reached && <span className="text-xs font-semibold text-amber-200">({t('quest.panel.reached')})</span>}
            </li>
          )
        })}
      </ul>
      {node.bestScore > 0 && (
        <p className="mt-2 text-sm">{t('quest.panel.best', { score: node.bestScore.toLocaleString() })}</p>
      )}
      {run && form === 'play' && (
        <p className="mt-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-2 text-sm">
          {t('quest.panel.runInProgress', { done: run.legsDone, total: run.legsTotal, time: formatTime(run.expiresAt) })}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {form === 'play' && (
          <>
            <PlaysLeftBar rateLimit={rateLimit} />
            {rateLimit.remaining <= 0 && <p className="text-sm text-amber-100">{t('quest.panel.noPlaysLeft')}</p>}
            {playUrl === null && <p className="text-sm text-amber-100">{t('quest.panel.notAvailableNow')}</p>}
            <button
              type="button"
              disabled={playUrl === null}
              onClick={() => {
                if (playUrl !== null) onPlay(playUrl)
              }}
              className={`${BUTTON} w-full border-cyan-300 bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {t(getPlayLabelKey(node, world.activeGauntlet))}
            </button>
          </>
        )}
        {form === 'locked' && (
          <p className="text-sm text-slate-200">
            <span aria-hidden="true">🔒 </span>
            {node.kind === 'BONUS' ? t('quest.panel.bonusLocked') : t('quest.panel.locked')}
          </p>
        )}
        {form === 'unavailable' && <p className="text-sm text-slate-200">{t('quest.panel.unavailable')}</p>}
        {form === 'paywall' && (
          <Link to={ROUTES.SUBSCRIPTION} className={`${BUTTON} w-full border-amber-300 bg-amber-400 text-slate-950 hover:bg-amber-300`}>
            {t('quest.panel.paywall')}
          </Link>
        )}
      </div>
    </div>
  )
}
