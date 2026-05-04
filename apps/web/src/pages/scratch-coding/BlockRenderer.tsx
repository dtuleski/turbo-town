import { useTranslation } from 'react-i18next'
import { useDroppable } from '@dnd-kit/core'
import {
  type Block,
  type BlockPath,
  type BlockType,
  type BlockDefinition,
  BLOCK_DEFINITIONS,
  getNestingDepth,
} from '@/utils/scratchCodingUtils'

// ════════════════════════════════════════════════════════════════════════════
// Helper
// ════════════════════════════════════════════════════════════════════════════

function getBlockDef(type: BlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((d) => d.type === type)
}

/** Encode a BlockPath as a dot-separated string for droppable IDs. */
function encodePath(path: BlockPath): string {
  return path.join('.')
}

// Container block types that use the C-shape wrapper
const CONTAINER_TYPES: Set<BlockType> = new Set(['REPEAT', 'IF_WALL_AHEAD', 'IF_ON_GOAL'])

// ════════════════════════════════════════════════════════════════════════════
// BlockRenderer — Renders a single block (flat pill or container C-shape)
// ════════════════════════════════════════════════════════════════════════════

export interface BlockRendererProps {
  block: Block
  path: BlockPath
  highlightedBlockId: string | null
  disabled: boolean
  onRemove: (path: BlockPath) => void
  onParameterChange: (path: BlockPath, value: number) => void
}

export function BlockRenderer({
  block,
  path,
  highlightedBlockId,
  disabled,
  onRemove,
  onParameterChange,
}: BlockRendererProps) {
  const def = getBlockDef(block.type)
  if (!def) return null

  const isContainer = CONTAINER_TYPES.has(block.type)

  if (isContainer) {
    return (
      <ContainerBlockWrapper
        block={block}
        path={path}
        def={def}
        highlightedBlockId={highlightedBlockId}
        disabled={disabled}
        onRemove={onRemove}
        onParameterChange={onParameterChange}
      />
    )
  }

  // Flat block — colored pill with parameter input and remove button
  return (
    <FlatBlock
      block={block}
      path={path}
      def={def}
      highlightedBlockId={highlightedBlockId}
      disabled={disabled}
      onRemove={onRemove}
      onParameterChange={onParameterChange}
    />
  )
}

// ════════════════════════════════════════════════════════════════════════════
// FlatBlock — Colored pill matching existing renderBlock style
// ════════════════════════════════════════════════════════════════════════════

interface FlatBlockProps {
  block: Block
  path: BlockPath
  def: BlockDefinition
  highlightedBlockId: string | null
  disabled: boolean
  onRemove: (path: BlockPath) => void
  onParameterChange: (path: BlockPath, value: number) => void
}

function FlatBlock({
  block,
  path,
  def,
  highlightedBlockId,
  disabled,
  onRemove,
  onParameterChange,
}: FlatBlockProps) {
  const { t } = useTranslation()
  const isHighlighted = highlightedBlockId === block.id

  const handleRemove = () => {
    if (disabled) return
    onRemove(path)
  }

  return (
    <div
      className={`${def.color} text-white text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5
        ${isHighlighted ? 'ring-2 ring-yellow-400 scale-105 shadow-lg shadow-yellow-400/30' : ''}
        ${disabled ? '' : 'cursor-pointer hover:opacity-80'}
      `}
      onClick={handleRemove}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleRemove()
      }}
      aria-label={`${t(def.label)} - ${t('scratchCoding.game.clickToRemove', 'click to remove')}`}
    >
      <span>{t(def.label)}</span>
      {def.hasParameter && (
        <input
          type="number"
          value={block.parameter ?? def.parameterDefault}
          min={def.parameterMin}
          max={def.parameterMax}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            const val = Math.max(
              def.parameterMin,
              Math.min(def.parameterMax, parseInt(e.target.value) || def.parameterDefault),
            )
            onParameterChange(path, val)
          }}
          className="w-8 h-5 text-center text-xs font-bold bg-white/30 rounded border-0 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
          aria-label={`${t(def.label)} parameter`}
        />
      )}
      {!disabled && <span className="text-white/50 text-[10px] ml-1">✕</span>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DroppableZone — A droppable area inside a container block
// ════════════════════════════════════════════════════════════════════════════

interface DroppableZoneProps {
  id: string
  children: React.ReactNode
  label?: string
}

function DroppableZone({ id, children, label }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div className="relative">
      {label && (
        <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider ml-1 mb-0.5 block">
          {label}
        </span>
      )}
      <div
        ref={setNodeRef}
        className={`min-h-[36px] bg-black/20 rounded-lg p-1.5 transition-all
          ${isOver ? 'ring-2 ring-cyan-400 bg-cyan-900/20' : ''}
        `}
      >
        {children}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// EmptyDropPlaceholder — "Drop blocks here" hint for empty zones
// ════════════════════════════════════════════════════════════════════════════

function EmptyDropPlaceholder() {
  const { t } = useTranslation()
  return (
    <span className="text-white/30 text-[10px] italic px-2 py-1 block text-center">
      {t('scratchCoding.nesting.dropHere', 'Drop blocks here')}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ContainerBlockWrapper — C-shaped visual for REPEAT, IF_WALL_AHEAD, IF_ON_GOAL
// ════════════════════════════════════════════════════════════════════════════

interface ContainerBlockWrapperProps {
  block: Block
  path: BlockPath
  def: BlockDefinition
  highlightedBlockId: string | null
  disabled: boolean
  onRemove: (path: BlockPath) => void
  onParameterChange: (path: BlockPath, value: number) => void
}

function ContainerBlockWrapper({
  block,
  path,
  def,
  highlightedBlockId,
  disabled,
  onRemove,
  onParameterChange,
}: ContainerBlockWrapperProps) {
  const { t } = useTranslation()
  const isHighlighted = highlightedBlockId === block.id
  const depth = getNestingDepth(path)
  const bodyChildren = block.body ?? []
  const elseChildren = block.elseBody ?? []
  const hasElse = def.hasElseBody
  const parentPathStr = encodePath(path)

  const handleRemoveContainer = () => {
    if (disabled) return
    onRemove(path)
  }

  return (
    <div
      className={`rounded-xl border-2 transition-all
        ${def.color} bg-opacity-20 border-current
        ${isHighlighted ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30' : ''}
      `}
      style={{ marginLeft: `${depth * 12}px` }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        className={`${def.color} text-white text-xs font-bold px-3 py-2 rounded-t-lg flex items-center gap-1.5
          ${disabled ? '' : 'cursor-pointer hover:opacity-80'}
        `}
        onClick={handleRemoveContainer}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleRemoveContainer()
        }}
        aria-label={`${t(def.label)} - ${t('scratchCoding.game.clickToRemove', 'click to remove')}`}
      >
        <span>{t(def.label)}</span>
        {def.hasParameter && (
          <input
            type="number"
            value={block.parameter ?? def.parameterDefault}
            min={def.parameterMin}
            max={def.parameterMax}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              const val = Math.max(
                def.parameterMin,
                Math.min(def.parameterMax, parseInt(e.target.value) || def.parameterDefault),
              )
              onParameterChange(path, val)
            }}
            className="w-8 h-5 text-center text-xs font-bold bg-white/30 rounded border-0 text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            aria-label={`${t(def.label)} parameter`}
          />
        )}
        {!disabled && <span className="text-white/50 text-[10px] ml-1">✕</span>}
      </div>

      {/* ── Body drop zone ──────────────────────────────────────── */}
      <div className="px-2 py-1.5">
        <DroppableZone id={`drop:body:${parentPathStr}:${bodyChildren.length}`}>
          {bodyChildren.length === 0 ? (
            <EmptyDropPlaceholder />
          ) : (
            <div className="flex flex-col gap-1.5">
              {bodyChildren.map((child, i) => (
                <BlockRenderer
                  key={child.id}
                  block={child}
                  path={[...path, 0, i]}
                  highlightedBlockId={highlightedBlockId}
                  disabled={disabled}
                  onRemove={onRemove}
                  onParameterChange={onParameterChange}
                />
              ))}
            </div>
          )}
        </DroppableZone>
      </div>

      {/* ── Else drop zone (IF_WALL_AHEAD only) ─────────────────── */}
      {hasElse && (
        <div className="px-2 py-1.5 border-t border-white/10">
          <DroppableZone
            id={`drop:else:${parentPathStr}:${elseChildren.length}`}
            label={t('scratchCoding.nesting.elseLabel', 'Else')}
          >
            {elseChildren.length === 0 ? (
              <EmptyDropPlaceholder />
            ) : (
              <div className="flex flex-col gap-1.5">
                {elseChildren.map((child, i) => (
                  <BlockRenderer
                    key={child.id}
                    block={child}
                    path={[...path, 1, i]}
                    highlightedBlockId={highlightedBlockId}
                    disabled={disabled}
                    onRemove={onRemove}
                    onParameterChange={onParameterChange}
                  />
                ))}
              </div>
            )}
          </DroppableZone>
        </div>
      )}

      {/* ── Bottom bar ──────────────────────────────────────────── */}
      <div className={`${def.color} h-2 rounded-b-lg`} />
    </div>
  )
}

export default BlockRenderer
