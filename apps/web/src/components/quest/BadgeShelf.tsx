import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { QuestWorldView } from '@/types/quest'
import { badgeKey, deriveWorldBadges } from '@/utils/questBadges'
import { worldName } from './questText'

export interface BadgeShelfProps {
  world: Pick<QuestWorldView, 'id' | 'badges'>
  reducedMotion: boolean
  /** Keys (`worldId:badgeId`) earned in the game just finished. */
  justEarned?: ReadonlySet<string>
  /** Show the one-line hint under each badge name (Achievements page). */
  showHints?: boolean
}

/** The two badges of one world, always shown: locked or earned, never by colour alone. */
export default function BadgeShelf({ world, reducedMotion, justEarned, showHints = false }: BadgeShelfProps) {
  const { t } = useTranslation()
  const badges = deriveWorldBadges(world)
  return (
    <ul
      aria-label={t('quest.badges.shelfLabel', { world: worldName(t, world.id) })}
      data-testid={`badge-shelf-${world.id}`}
      className="mb-3 flex flex-wrap gap-2 px-3 sm:px-0"
    >
      {badges.map((badge) => {
        const isNew = badge.earned && (justEarned?.has(badgeKey(world.id, badge.id)) ?? false)
        const animate = isNew && !reducedMotion
        const state = t(badge.earned ? 'quest.badges.earned' : 'quest.badges.locked')
        const tone = badge.earned
          ? 'border-amber-500 bg-amber-300 text-slate-900'
          : 'border-dashed border-slate-400 bg-white text-slate-700'
        const body = (
          <>
            <span aria-hidden="true" className="text-lg">
              {badge.earned ? '\u{1F3C5}' : '\u{1F512}'}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold">{t(`quest.badges.${badge.id}.name`)}</span>
              <span className="text-xs font-semibold">
                {state}
                {isNew && (
                  <span className="ml-1 rounded bg-slate-950 px-1 text-[0.625rem] font-bold uppercase text-amber-200">
                    {t('quest.badges.new')}
                  </span>
                )}
              </span>
              {showHints && <span className="text-xs">{t(`quest.badges.${badge.id}.hint`)}</span>}
            </span>
          </>
        )
        const className = `flex min-h-[44px] items-center gap-2 rounded-2xl border-2 px-3 py-1 shadow-sm ${tone}`
        return (
          <li key={badge.id} data-badge={badge.id} data-earned={badge.earned ? 'true' : 'false'}>
            {animate ? (
              <motion.div
                data-animated="true"
                className={className}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {body}
              </motion.div>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
