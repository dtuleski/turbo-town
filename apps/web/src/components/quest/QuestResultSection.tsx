import { useTranslation } from 'react-i18next'
import type { QuestResultPayload } from '@/types/quest'
import { hasNodeName, nodeName } from './questText'

export interface QuestResultSectionProps {
  /** null in quest mode means the progress write failed (completeGame returned quest: null). */
  result: QuestResultPayload | null
  onNextLeg?: () => void
}

const clampStars = (n: number): number => (Number.isInteger(n) ? Math.min(3, Math.max(0, n)) : 0)
const starGlyphs = (n: number): string => '★'.repeat(n) + '☆'.repeat(3 - n)

/** Quest part of the result modal (FD section 4). Stars are shown as glyphs plus text. */
export default function QuestResultSection({ result, onNextLeg }: QuestResultSectionProps) {
  const { t } = useTranslation()
  const box = 'rounded-lg border border-cyan-500/40 bg-slate-950 p-3 text-sm text-slate-100'

  if (result === null) {
    return (
      <section aria-label={t('quest.title')} className={box}>
        <p>{t('quest.result.notSaved')}</p>
      </section>
    )
  }

  const gauntlet = result.gauntlet ?? null
  const score = Math.round(result.score)
  const unlockedNames = result.newlyUnlocked.filter((id) => hasNodeName(t, id)).map((id) => nodeName(t, id))

  if (gauntlet?.status === 'EXPIRED') {
    return (
      <section aria-label={t('quest.title')} className={box}>
        <p>{t('quest.result.expired')}</p>
      </section>
    )
  }

  if (gauntlet?.status === 'IN_PROGRESS') {
    return (
      <section aria-label={t('quest.title')} className={box}>
        <p className="font-semibold text-cyan-100">
          {t('quest.result.legDone', { k: gauntlet.legIndex + 1, n: gauntlet.legsTotal })}
        </p>
        <p>{t('quest.result.legScore', { score: score.toLocaleString() })}</p>
        {onNextLeg && gauntlet.nextLeg && (
          <button
            type="button"
            onClick={onNextLeg}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-cyan-300 bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {t('quest.result.nextLeg')}
          </button>
        )}
      </section>
    )
  }

  const stars = clampStars(result.stars)
  const best = clampStars(result.bestStars)
  const nextThreshold = result.thresholds.find((points) => points > score)

  return (
    <section aria-label={t('quest.title')} className={`${box} space-y-1`}>
      <p className="font-semibold">
        <span aria-hidden="true" className="text-amber-300">{starGlyphs(stars)} </span>
        {t('quest.result.stars', { count: stars })}
      </p>
      <p>{t('quest.result.best', { count: best })}</p>
      <p>
        {gauntlet?.status === 'COMPLETE'
          ? t('quest.result.combined', { score: score.toLocaleString() })
          : t('quest.result.score', { score: score.toLocaleString() })}
      </p>
      <p className="font-semibold text-slate-200">{t('quest.result.goals')}</p>
      <ul>
        {result.thresholds.map((points, index) => {
          const reached = score >= points
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
      <p>
        {nextThreshold === undefined
          ? t('quest.result.allGoals')
          : t('quest.result.nextGoal', { points: nextThreshold.toLocaleString() })}
      </p>
      {unlockedNames.length > 0 && (
        <p className="font-semibold text-cyan-100">{t('quest.result.unlocked', { names: unlockedNames.join(', ') })}</p>
      )}
      {result.worldCleared && <p className="font-bold text-amber-200">{t('quest.result.worldCleared')}</p>}
    </section>
  )
}
