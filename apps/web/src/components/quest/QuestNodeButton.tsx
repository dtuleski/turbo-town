import type { MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { QuestNodeView } from '@/types/quest'
import {
  getNodeAriaParts,
  getNodeIcon,
  getShownStars,
  type NodeVisualState,
} from '@/utils/questMap'
import { nodeName } from './questText'

const STATE_CLASSES: Record<NodeVisualState, string> = {
  locked: 'border-white bg-slate-200 text-slate-600',
  available: 'border-white bg-orange-400 text-slate-900',
  earned1: 'border-white bg-amber-300 text-slate-900',
  earned2: 'border-white bg-amber-300 text-slate-900',
  earned3: 'border-white bg-amber-300 text-slate-900 ring-4 ring-amber-500',
  unavailable: 'border-dashed border-slate-500 bg-slate-100 text-slate-600',
}
const FOCUS =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-slate-900'
export interface QuestNodeButtonProps {
  node: QuestNodeView
  state: NodeVisualState
  reducedMotion: boolean
  justUnlocked?: boolean
  onSelect: (node: QuestNodeView, button: HTMLButtonElement) => void
}

/** One map node: a real button (Enter/Space open the panel), never colour-only state. */
export default function QuestNodeButton({
  node,
  state,
  reducedMotion,
  justUnlocked = false,
  onSelect,
}: QuestNodeButtonProps) {
  const { t } = useTranslation()
  const name = nodeName(t, node.id)
  const aria = getNodeAriaParts(node, state, justUnlocked)
  const label = [t(aria.key, { name, count: aria.count }), ...aria.extras.map((key) => t(key))].join(', ')
  const stars = getShownStars(node)
  const isBoss = node.kind === 'BOSS'
  const isBonus = node.kind === 'BONUS'

  const size = isBoss ? 'h-20 w-20 min-h-[64px] min-w-[64px] text-3xl' : 'h-14 w-14 min-h-[48px] min-w-[48px] text-xl'
  const shape = isBonus ? 'rotate-45 rounded-lg' : 'rounded-full'
  const className = `relative flex items-center justify-center border-4 font-bold shadow-[0_5px_0_rgba(15,23,42,0.25),0_8px_14px_rgba(15,23,42,0.25)] ${size} ${shape} ${STATE_CLASSES[state]} ${FOCUS}`
  const content = (
    <>
      {state === 'available' && !reducedMotion && (
        <span aria-hidden="true" className="absolute -inset-2 animate-pulse rounded-full border-4 border-orange-500" />
      )}
      {state === 'available' && reducedMotion && (
        <span aria-hidden="true" className="absolute -inset-2 rounded-full border-4 border-orange-500" />
      )}
      {justUnlocked && (
        <span aria-hidden="true" className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-600" />
      )}
      <span aria-hidden="true" className={isBonus ? '-rotate-45' : undefined}>
        {state.startsWith('earned') ? '★' : getNodeIcon(state)}
      </span>
    </>
  )
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    onSelect(node, event.currentTarget)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${state === 'available' && !reducedMotion ? 'motion-safe:animate-quest-bob' : ''}`}>
      {justUnlocked && !reducedMotion ? (
        <motion.button
          type="button"
          aria-label={label}
          data-node-id={node.id}
          className={className}
          onClick={handleClick}
          initial={{ scale: 0.6 }}
          animate={{ scale: [0.6, 1.2, 1] }}
          transition={{ duration: 0.6 }}
        >
          {content}
        </motion.button>
      ) : (
        <button type="button" aria-label={label} data-node-id={node.id} className={className} onClick={handleClick}>
          {content}
        </button>
      )}
      {isBoss && (
        <span aria-hidden="true" className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 text-3xl drop-shadow">
          {'\u{1F451}'}
        </span>
      )}
      {isBonus && (
        <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-3 z-10 text-2xl drop-shadow">
          {'\u{1F381}'}
        </span>
      )}
      </div>
      <span aria-hidden="true" className="flex max-w-[8rem] flex-col items-center rounded-2xl bg-white px-2.5 py-1 text-center leading-tight shadow-md">
        {state !== 'unavailable' && (
          <span className="text-xs text-amber-600">
            {'★'.repeat(stars)}
            <span className="text-slate-500">{'☆'.repeat(3 - stars)}</span>
          </span>
        )}
        <span className="block w-full truncate text-xs font-bold text-slate-800">{name}</span>
        {justUnlocked && (
          <span className="mt-0.5 rounded-full bg-amber-300 px-1.5 text-[0.625rem] font-bold uppercase text-slate-900">
            {t('quest.node.new')}
          </span>
        )}
      </span>
    </div>
  )
}
