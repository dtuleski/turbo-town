import { useTranslation } from 'react-i18next'
import type { Point } from '@/utils/circuitBuilderGeometry'
import type { TrayItem } from '@/utils/circuitBuilderState'
import type { ElementKind } from '@/utils/circuitEngine'

interface ComponentTrayProps {
  items: readonly TrayItem[]
  armedKind: ElementKind | null
  /** Click, tap, and Enter all arrive here: a real button is focusable and Enter-activated. */
  onArm: (kind: ElementKind) => void
  onDragStart: (kind: ElementKind) => void
  onDragEnd: () => void
  /** Touch release, in client coordinates. The host decides whether it landed on the canvas. */
  onTouchDrop: (kind: ElementKind, client: Point) => void
  /** Appended to the tray's own classes, so the host can place the tray in its layout without the
   * tray knowing anything about that layout. */
  className?: string
}

/**
 * The component tray (C4).
 *
 * Plain DOM buttons rather than a drag library: the brief rules out a drag dependency, and a real
 * `<button>` brings focus, Enter activation, and `aria-pressed` with it, so the keyboard path costs
 * nothing extra. Every string is a locale key — there is no English in this file.
 */
export default function ComponentTray({
  items,
  armedKind,
  onArm,
  onDragStart,
  onDragEnd,
  onTouchDrop,
  className,
}: ComponentTrayProps) {
  const { t } = useTranslation()

  return (
    <div className={['w-full lg:w-48', className ?? ''].join(' ').trimEnd()}>
      <h3 className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-cyan-300">
        {t('circuitBuilder.tray.title')}
      </h3>
      <ul className="flex snap-x gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const armed = armedKind === item.kind
          return (
            <li key={item.kind} className="shrink-0 snap-start lg:shrink">
              <button
                type="button"
                draggable={!item.disabled}
                disabled={item.disabled}
                aria-pressed={armed}
                onClick={() => {
                  onArm(item.kind)
                }}
                onDragStart={() => {
                  onDragStart(item.kind)
                }}
                onDragEnd={onDragEnd}
                onTouchStart={() => {
                  onDragStart(item.kind)
                }}
                onTouchEnd={(event) => {
                  const touch = event.changedTouches[0]
                  if (touch === undefined) {
                    onDragEnd()
                    return
                  }
                  onTouchDrop(item.kind, { x: touch.clientX, y: touch.clientY })
                }}
                className={[
                  // min-h-[44px]: the smallest touch target that is reliably hittable with a
                  // thumb (NFR-CB-11).
                  'flex min-h-[44px] w-28 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors lg:w-full',
                  item.disabled
                    ? 'cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-500'
                    : armed
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/60',
                ].join(' ')}
              >
                <span className="text-sm font-semibold">{t(item.labelKey)}</span>
                <span className="text-[11px] text-slate-400">
                  {item.remaining > 0
                    ? t('circuitBuilder.tray.remaining', { count: item.remaining })
                    : t('circuitBuilder.tray.exhausted')}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {armedKind !== null && (
        <p className="mt-2 text-center text-[11px] text-cyan-300/80 lg:text-left">
          {t('circuitBuilder.tray.armed')}
        </p>
      )}
    </div>
  )
}
