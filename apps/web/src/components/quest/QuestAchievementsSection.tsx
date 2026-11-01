import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import type { QuestProgressState } from '@/hooks/useQuestProgress'
import { summarizeBadges } from '@/utils/questBadges'
import BadgeShelf from './BadgeShelf'
import { worldName } from './questText'

export interface QuestAchievementsSectionProps {
  state: Pick<QuestProgressState, 'data' | 'loading' | 'error'>
  reducedMotion?: boolean
}

/** Achievements page block: the Quest Map world badges, read from getQuestProgress. */
export function QuestAchievementsSection({ state, reducedMotion = false }: QuestAchievementsSectionProps) {
  const { t } = useTranslation()
  // Loading or failure: render nothing. A Quest Map hiccup must not show an error on the Achievements page.
  if (state.loading || state.error || !state.data) return null
  const worlds = [...state.data.worlds].sort((a, b) => a.order - b.order)
  const summary = summarizeBadges(state.data)
  return (
    <section className="mb-8" aria-labelledby="quest-achievements-title">
      <div className="flex items-center justify-between mb-3">
        <h2 id="quest-achievements-title" className="text-lg font-bold">
          {t('quest.achievements.title')}
        </h2>
        <span className="text-xs text-text-secondary">{t('quest.achievements.summary', { earned: summary.earned, total: summary.total })}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {worlds.map((world) => (
          <div key={world.id} className="card py-4 px-4">
            <h3 className="font-bold text-sm mb-2">{worldName(t, world.id)}</h3>
            <BadgeShelf world={world} reducedMotion={reducedMotion} showHints />
          </div>
        ))}
      </div>
    </section>
  )
}

/** Wires the section to the user's reduced-motion preference. */
export default function QuestAchievementsSectionConnected({ state }: { state: QuestAchievementsSectionProps['state'] }) {
  const reducedMotion = useReducedMotion() ?? false
  return <QuestAchievementsSection state={state} reducedMotion={reducedMotion} />
}
