import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '@/config/constants'
import { createSandboxSession } from '@/services/circuitSandboxSession'
import CircuitBuilderSurface from './CircuitBuilderSurface'

// Created once at module load: the sandbox has no per-visit state. Nothing here reaches the API
// layer, which an isolation test proves from the module graph.
const session = createSandboxSession()

/** Free play with every component. No goal, no score, no daily game used. */
export default function CircuitBuilderSandboxPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="mx-auto w-full max-w-6xl rounded-2xl bg-slate-950 px-3 py-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="inline-block rounded-full border border-cyan-400/60 px-3 py-1 text-sm font-semibold text-cyan-100">
            {t('circuitBuilder.sandbox.badge')}
          </p>
          <p className="mt-1 text-sm text-slate-300">{t('circuitBuilder.sandbox.note')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            navigate(ROUTES.CIRCUIT_BUILDER_SETUP)
          }}
          className="min-h-[44px] rounded-lg border border-slate-500 px-4 py-2 text-sm text-slate-200 hover:border-cyan-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          {t('circuitBuilder.sandbox.back')}
        </button>
      </header>
      <CircuitBuilderSurface level={session.level} showRover showReadout />
    </div>
  )
}
