import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { useQuestProgress } from '@/hooks/useQuestProgress'
import type { QuestContext } from '@/utils/questShared'
import { parseQuestParam } from '@/utils/questLaunch'
import { hasNodeName, nodeName as nodeNameOf } from './questText'

export interface QuestBannerViewProps {
  nodeName?: string
  goal?: number
}

/** "Playing from Quest Map" strip with the node name, its 3-star goal and a way back. */
export function QuestBannerView({ nodeName, goal }: QuestBannerViewProps) {
  const { t } = useTranslation()
  return (
    <div className="border-b-2 border-violet-200 bg-gradient-to-r from-sky-100 to-violet-100 text-slate-800">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p className="text-sm">
          <span aria-hidden="true">🗺️ </span>
          <span className="font-bold text-violet-800">{t('quest.banner.playing')}</span>
          {nodeName && <span>: {nodeName}</span>}
          {goal !== undefined && <span className="font-semibold text-amber-800"> · {t('quest.banner.goal', { points: goal.toLocaleString() })}</span>}
        </p>
        <Link
          to={ROUTES.QUEST_MAP}
          className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-violet-600 bg-white px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-violet-700"
        >
          {t('quest.banner.back')}
        </Link>
      </div>
    </div>
  )
}

function QuestBannerWithData({ ctx }: { ctx: QuestContext }) {
  const { t } = useTranslation()
  const { data } = useQuestProgress()
  const known = hasNodeName(t, ctx.nodeId)
  const node = data?.worlds.find((w) => w.id === ctx.worldId)?.nodes.find((n) => n.id === ctx.nodeId)
  const goal = known && node ? node.thresholds[2] : undefined
  return <QuestBannerView nodeName={known ? nodeNameOf(t, ctx.nodeId) : undefined} goal={goal} />
}

/** Renders only in quest mode (a valid `quest` URL param); otherwise nothing and no request. */
export default function QuestBanner() {
  const { search } = useLocation()
  const ctx = parseQuestParam(search)
  if (ctx === null) return null
  return <QuestBannerWithData key={`${ctx.worldId}:${ctx.nodeId}`} ctx={ctx} />
}
