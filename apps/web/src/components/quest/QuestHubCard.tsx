import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'

/** Hub entry to the Quest Map. Static: no props, no tier check and no network request. */
export default function QuestHubCard() {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="quest-hub-card-title"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-cyan-500/40 bg-slate-950 p-4 text-slate-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="quest-hub-card-title" className="text-lg font-bold text-cyan-100">
          <span aria-hidden="true">🗺️ </span>
          {t('quest.hub.title')}
        </h2>
        <p className="text-sm text-slate-300">{t('quest.hub.body')}</p>
      </div>
      <Link
        to={ROUTES.QUEST_MAP}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-cyan-300 bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        {t('quest.hub.cta')}
      </Link>
    </section>
  )
}
