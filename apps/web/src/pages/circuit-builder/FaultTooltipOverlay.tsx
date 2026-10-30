import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FaultOverlay } from '@/utils/circuitFaultOverlay'

interface FaultTooltipOverlayProps {
  overlay: FaultOverlay | null
  fuseBlown: boolean
  /** Identifies one fault event; a new event re-shows a dismissed card. */
  faultKey: string
  reducedMotion: boolean
  onResetFuse: () => void
}

/** Gap between the faulty cell and the card, in px, so the card never covers the cell. */
const ANCHOR_GAP_PX = 14

function transformFor(overlay: FaultOverlay): string {
  const x = overlay.align === 'start' ? '0%' : overlay.align === 'end' ? '-100%' : '-50%'
  const y = overlay.placement === 'above' ? `calc(-100% - ${String(ANCHOR_GAP_PX)}px)` : `${String(ANCHOR_GAP_PX)}px`
  return `translate(${x}, ${y})`
}

/**
 * A card anchored at the faulty cell. It explains the fault and, when the fuse has blown, offers
 * the reset. It never navigates, submits or opens a modal: a fault is a lesson, not the end of
 * the attempt. The status row stays the only live region, so this card is not announced twice.
 */
export default function FaultTooltipOverlay({
  overlay,
  fuseBlown,
  faultKey,
  reducedMotion,
  onResetFuse,
}: FaultTooltipOverlayProps) {
  const { t } = useTranslation()
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)

  const present = overlay !== null
  const visible = present && dismissedKey !== faultKey

  // Forget a dismissal once the fault is gone, so the same fault coming back is shown again.
  useEffect(() => {
    if (!present) {
      setDismissedKey(null)
    }
  }, [present])

  useEffect(() => {
    if (!visible) {
      return undefined
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setDismissedKey(faultKey)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [visible, faultKey])

  if (overlay === null || !visible) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        role="group"
        aria-label={t('circuitBuilder.faultOverlay.label')}
        className={[
          'pointer-events-auto absolute w-64 max-w-[70%] rounded-lg border border-amber-400/70 bg-slate-900 p-2 text-xs text-slate-100 shadow-xl',
          reducedMotion ? '' : 'transition-opacity duration-150',
        ]
          .join(' ')
          .trim()}
        style={{
          left: `${String(overlay.leftPct)}%`,
          top: `${String(overlay.topPct)}%`,
          transform: transformFor(overlay),
        }}
      >
        <p className="font-semibold text-amber-200">
          <span aria-hidden="true">⚠ </span>
          {t(overlay.titleKey)}
        </p>
        <p className="mt-1 text-slate-200">{t(overlay.helpKey)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {fuseBlown && (
            <button
              type="button"
              onClick={onResetFuse}
              className="min-h-[44px] rounded-lg border border-rose-400/60 px-3 py-2 text-rose-200 hover:bg-rose-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {t('circuitBuilder.status.resetFuse')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setDismissedKey(faultKey)
            }}
            className="min-h-[44px] rounded-lg border border-slate-500 px-3 py-2 text-slate-200 hover:border-cyan-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {t('circuitBuilder.faultOverlay.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
