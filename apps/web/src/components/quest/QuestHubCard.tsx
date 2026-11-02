import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'

/** Hub entry to the Quest Map. Static: no props, no tier check and no network request. */
export default function QuestHubCard() {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="quest-hub-card-title"
      className="mb-6 flex flex-col gap-3 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-sky-100 to-violet-100 p-4 text-slate-800 shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="quest-hub-card-title" className="text-lg font-black text-violet-800">
          <span aria-hidden="true">🗺️ </span>
          {t('quest.hub.title')}
        </h2>
        <p className="text-sm text-slate-700">{t('quest.hub.body')}</p>
      </div>
      <Link
        to={ROUTES.QUEST_MAP}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-amber-600 bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-300 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-violet-700"
      >
        {t('quest.hub.cta')}
      </Link>
    </section>
  )
}
