import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatQuantity, presentCircuit } from '@/utils/circuitPresentation'
import type { PresentedElement } from '@/utils/circuitPresentation'
import type { CircuitLayout, CircuitResult, ElementKind, NumericDisclosure } from '@/utils/circuitEngine'

interface CircuitReadoutProps {
  result: CircuitResult | null
  layout: CircuitLayout
  /** From the level: decides which numbers exist at all. */
  tier: NumericDisclosure
  fuseBlown: boolean
  className?: string
}

/** Parts that carry a reading worth showing. Wires, switches and sources are summarised instead. */
const READOUT_KINDS: readonly ElementKind[] = ['led', 'motor', 'buzzer', 'resistor']

const STATE_GLYPH: Record<PresentedElement['state'], string> = {
  lit: '●',
  dim: '◐',
  dark: '○',
  spark: '✕',
}

/** A, B, C... so two motors can be told apart without printing a digit at the lowest tier. */
function letterFor(index: number): string {
  return String.fromCharCode(65 + (index % 26))
}

/**
 * Per-part readout, driven by `presentCircuit`, so it can only ever show what the level's
 * disclosure tier allows and never a negative number. State is a glyph plus a word.
 */
export default function CircuitReadout({ result, layout, tier, fuseBlown, className }: CircuitReadoutProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const presented = useMemo(
    () => (result === null ? null : presentCircuit(result, layout, tier)),
    [result, layout, tier]
  )

  const rows = useMemo(() => {
    if (presented === null) {
      return []
    }
    const totals: Partial<Record<ElementKind, number>> = {}
    for (const element of presented.elements) {
      totals[element.kind] = (totals[element.kind] ?? 0) + 1
    }
    const seen: Partial<Record<ElementKind, number>> = {}
    return presented.elements
      .filter((element) => READOUT_KINDS.includes(element.kind))
      .map((element) => {
        const index = seen[element.kind] ?? 0
        seen[element.kind] = index + 1
        const name = t(`circuitBuilder.component.${element.kind}.name`)
        const label = (totals[element.kind] ?? 0) > 1 ? `${name} ${letterFor(index)}` : name
        return { element, label }
      })
  }, [presented, t])

  const hint =
    tier === 'none'
      ? t('circuitBuilder.readout.noneHint')
      : tier === 'qualitative'
        ? t('circuitBuilder.readout.qualitativeHint')
        : null

  return (
    <section
      className={['rounded-lg border border-slate-700 bg-slate-900 p-2', className ?? ''].join(' ').trim()}
    >
      <h3 className="mb-1 text-xs font-semibold text-slate-200">{t('circuitBuilder.readout.title')}</h3>

      {presented === null || fuseBlown ? (
        <p className="text-[11px] text-slate-400">{t('circuitBuilder.readout.noPath')}</p>
      ) : (
        <>
          {presented.supplyVoltage !== undefined && (
            <p className="mb-1 text-[11px] text-slate-200">
              {t('circuitBuilder.readout.supply')}: {formatQuantity(presented.supplyVoltage, 'V', locale)}
            </p>
          )}
          <ul className="space-y-1.5 text-[11px] text-slate-200">
            {rows.map(({ element, label }) => {
              const stateWord = t(`circuitBuilder.readout.state.${element.state}`)
              return (
                <li
                  key={element.elementId}
                  aria-label={`${label}: ${stateWord}`}
                  className="rounded border border-slate-700/70 px-1.5 py-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{label}</span>
                    <span>
                      <span aria-hidden="true">{STATE_GLYPH[element.state]} </span>
                      {stateWord}
                    </span>
                  </div>
                  {element.brightness !== undefined && element.relativeBrightness !== undefined && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded border border-slate-500" aria-hidden="true">
                        <div
                          className="h-full bg-cyan-300"
                          style={{ width: `${String(Math.round(element.relativeBrightness * 100))}%` }}
                        />
                      </div>
                      <span>{t(`circuitBuilder.readout.brightness.${element.brightness}`)}</span>
                    </div>
                  )}
                  {element.voltage !== undefined && (
                    <p>
                      {t('circuitBuilder.readout.voltage')}: {formatQuantity(element.voltage, 'V', locale)}
                    </p>
                  )}
                  {element.resistance !== undefined && (
                    <p>
                      {t('circuitBuilder.readout.resistance')}:{' '}
                      {formatQuantity(element.resistance, 'ohm', locale)}
                    </p>
                  )}
                  {element.current !== undefined && (
                    <p>
                      {t('circuitBuilder.readout.current')}: {formatQuantity(element.current, 'A', locale)}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          {presented.totalResistance !== undefined && presented.totalCurrent !== undefined && (
            <div className="mt-1 text-[11px] text-slate-200">
              <p>
                {t('circuitBuilder.readout.totalResistance')}:{' '}
                {formatQuantity(presented.totalResistance, 'ohm', locale)}
              </p>
              <p>
                {t('circuitBuilder.readout.totalCurrent')}:{' '}
                {formatQuantity(presented.totalCurrent, 'A', locale)}
              </p>
            </div>
          )}
        </>
      )}
      {hint !== null && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </section>
  )
}
