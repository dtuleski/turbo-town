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
  locked: 'border-slate-500 bg-slate-700 text-slate-200',
  available: 'border-cyan-200 bg-cyan-500 text-slate-950',
  earned1: 'border-amber-200 bg-amber-400 text-slate-950',
  earned2: 'border-amber-200 bg-amber-400 text-slate-950',
  earned3: 'border-amber-100 bg-amber-300 text-slate-950',
  unavailable: 'border-dashed border-slate-400 bg-slate-800 text-slate-300',
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300'

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

  const size = isBoss ? 'h-16 w-16 min-h-[64px] min-w-[64px] text-xl' : 'h-12 w-12 min-h-[48px] min-w-[48px] text-base'
  const shape = isBonus ? 'rotate-45 rounded-lg' : 'rounded-full'
  const className = `relative flex items-center justify-center border-2 font-bold shadow-lg ${size} ${shape} ${STATE_CLASSES[state]} ${FOCUS}`
  const content = (
    <>
      {state === 'available' && !reducedMotion && (
        <span aria-hidden="true" className="absolute -inset-1.5 animate-pulse rounded-full border-2 border-cyan-300" />
      )}
      {state === 'available' && reducedMotion && (
        <span aria-hidden="true" className="absolute -inset-1.5 rounded-full border-2 border-cyan-300" />
      )}
      {justUnlocked && (
        <span aria-hidden="true" className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-200" />
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
    <div className="flex flex-col items-center gap-1">
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
      <span aria-hidden="true" className="flex max-w-[6rem] flex-col items-center text-center leading-tight">
        {state !== 'unavailable' && (
          <span className="text-xs text-amber-200">
            {'★'.repeat(stars)}
            <span className="text-slate-500">{'☆'.repeat(3 - stars)}</span>
          </span>
        )}
        <span className="block w-full truncate text-xs font-semibold text-slate-100">{name}</span>
        {justUnlocked && (
          <span className="rounded bg-amber-300 px-1 text-[0.625rem] font-bold uppercase text-slate-950">
            {t('quest.node.new')}
          </span>
        )}
      </span>
    </div>
  )
}
