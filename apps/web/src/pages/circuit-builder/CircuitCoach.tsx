import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface CircuitCoachProps {
  onClose: () => void
}

const STROKE = '#67e8f9'
const MUTED = '#94a3b8'

/** Step 1: pick a part in the tray, then tap a square. Static, so reduced motion needs no branch. */
function PickIllustration() {
  return (
    <svg viewBox="0 0 160 90" className="h-20 w-36" aria-hidden="true" focusable="false">
      <rect x="6" y="14" width="38" height="62" rx="6" fill="#0f172a" stroke={MUTED} strokeWidth="2" />
      <rect x="12" y="22" width="26" height="14" rx="4" fill="#164e63" stroke={STROKE} strokeWidth="2" />
      <rect x="12" y="44" width="26" height="14" rx="4" fill="#1e293b" stroke={MUTED} strokeWidth="1.5" />
      <path d="M50 29 H82" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <path d="M74 21 L84 29 L74 37" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke={MUTED} strokeWidth="1.5" fill="none">
        <rect x="92" y="14" width="62" height="62" rx="4" strokeDasharray="3 4" />
        <path d="M113 14 V76 M134 14 V76 M92 35 H154 M92 56 H154" />
      </g>
      <rect x="116" y="38" width="15" height="15" rx="3" fill="#164e63" stroke={STROKE} strokeWidth="2" />
    </svg>
  )
}

/** Step 2: press one dot and drag to another. */
function DragIllustration() {
  return (
    <svg viewBox="0 0 160 90" className="h-20 w-36" aria-hidden="true" focusable="false">
      <rect x="12" y="26" width="38" height="38" rx="6" fill="#17213a" stroke={MUTED} strokeWidth="2" />
      <rect x="110" y="26" width="38" height="38" rx="6" fill="#17213a" stroke={MUTED} strokeWidth="2" />
      <circle cx="54" cy="45" r="7" fill="#fbbf24" />
      <circle cx="106" cy="45" r="7" fill="none" stroke={STROKE} strokeWidth="3" />
      <path d="M61 45 H99" stroke="#fbbf24" strokeWidth="3" strokeDasharray="7 5" strokeLinecap="round" />
      <path d="M92 38 L100 45 L92 52" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Step 3: one closed loop, plus to minus, with the bulb pointing the right way. */
function LoopIllustration() {
  return (
    <svg viewBox="0 0 160 90" className="h-20 w-36" aria-hidden="true" focusable="false">
      <rect x="22" y="20" width="116" height="52" rx="12" fill="none" stroke={STROKE} strokeWidth="3" />
      <rect x="10" y="34" width="26" height="24" rx="5" fill="#17213a" stroke={MUTED} strokeWidth="2" />
      <text x="17" y="31" fill="#fca5a5" fontSize="13" fontWeight="700">+</text>
      <text x="30" y="31" fill="#93c5fd" fontSize="13" fontWeight="700">{'\u2212'}</text>
      <rect x="110" y="34" width="34" height="24" rx="5" fill="#17213a" stroke={MUTED} strokeWidth="2" />
      <path d="M121 38 V54 L134 46 Z" fill="none" stroke="#ecfeff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M136 38 V54" stroke="#ecfeff" strokeWidth="2" />
      <path d="M62 14 L72 20 L62 26" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Step({ n, illustration, children }: { n: number; illustration: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-black text-slate-950"
      >
        {n}
      </span>
      <span className="shrink-0">{illustration}</span>
      <span className="text-sm text-slate-100">{children}</span>
    </li>
  )
}

/**
 * First-time "how to play" overlay for guided levels. A modal dialog with one control, so focus is
 * kept inside by swallowing Tab. Escape closes it. Nothing animates, so reduced motion is honoured
 * by construction. Closing hands control back to the host, which remembers the dismissal.
 */
export default function CircuitCoach({ onClose }: CircuitCoachProps) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      closeRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3"
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="circuit-coach-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-500/50 bg-slate-900 p-4 text-slate-100 shadow-2xl"
      >
        <h2 id="circuit-coach-title" className="mb-3 text-lg font-black text-cyan-200">
          {t('circuitBuilder.coach.title')}
        </h2>
        <ol className="flex flex-col gap-3">
          <Step n={1} illustration={<PickIllustration />}>
            {t('circuitBuilder.coach.step1')}
          </Step>
          <Step n={2} illustration={<DragIllustration />}>
            {t('circuitBuilder.coach.step2')}
          </Step>
          <Step n={3} illustration={<LoopIllustration />}>
            {t('circuitBuilder.coach.step3')}
          </Step>
        </ol>
        <p className="mt-3 text-xs text-slate-300">{t('circuitBuilder.coach.keyboard')}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[44px] w-full rounded-lg border border-cyan-400 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          {t('circuitBuilder.coach.close')}
        </button>
      </div>
    </div>
  )
}
