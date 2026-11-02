import type { CSSProperties } from 'react'
import type { QuestNodeView, QuestWorldView } from '@/types/quest'
import {
  buildPathD,
  completedSegmentCount,
  getNodeVisualState,
  getPathNodes,
  getPhonePosition,
  getPhoneRowY,
  orderNodes,
  type Point,
} from '@/utils/questMap'
import QuestNodeButton from './QuestNodeButton'
import QuestScene, { getTrailColors, type TrailColors } from './QuestScene'

export interface QuestWorldPathProps {
  world: QuestWorldView
  onSelect: (node: QuestNodeView, button: HTMLButtonElement) => void
  reducedMotion: boolean
  justUnlocked?: ReadonlySet<string>
}

const STROKE: CSSProperties = { vectorEffect: 'non-scaling-stroke' }

function Trail({ d, base, outline, dots }: { d: string; base: string; outline: string; dots: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={outline} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" style={STROKE} />
      <path d={d} fill="none" stroke={base} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" style={STROKE} />
      <path
        d={d}
        fill="none"
        stroke={dots}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="0.1 11"
        style={STROKE}
      />
    </>
  )
}

function PathSvg({
  points,
  done,
  bonus,
  className,
  colors,
}: {
  points: Point[]
  done: number
  bonus: [Point, Point] | null
  className: string
  colors: TrailColors
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute ${className}`}
    >
      {bonus && (
        <path
          d={buildPathD(bonus)}
          fill="none"
          stroke={colors.outline}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="0.1 12"
          style={STROKE}
        />
      )}
      <Trail d={buildPathD(points)} base={colors.base} outline={colors.outline} dots={colors.outline} />
      {done > 0 && <Trail d={buildPathD(points.slice(0, done + 1))} base="#4ADE80" outline="#166534" dots="#FFFFFF" />}
    </svg>
  )
}
/**
 * One world's winding path. One `<ol>` in path order (bonus last), so tab order follows progress.
 * Below 640px: a vertical column of 96px rows from the bottom up, lane x clamped to 15-85%.
 * From 640px: a 4:5 map box with nodes at the configured x/y percentages.
 */
export default function QuestWorldPath({ world, onSelect, reducedMotion, justUnlocked }: QuestWorldPathProps) {
  const ordered = orderNodes(world.nodes)
  const pathNodes = getPathNodes(world.nodes)
  const bonusNode = ordered.find((node) => node.kind === 'BONUS') ?? null
  const boss = pathNodes[pathNodes.length - 1] ?? null
  const done = completedSegmentCount(world.nodes)
  const colors = getTrailColors(world.id)
  const rows = ordered.length

  const desktopPoints = pathNodes.map((node) => ({ x: node.map.x, y: node.map.y }))
  const phonePoints = pathNodes.map((node, index) => ({ x: getPhonePosition(node.map.x), y: getPhoneRowY(index, rows) }))
  const desktopBonus: [Point, Point] | null =
    bonusNode && boss ? [{ x: boss.map.x, y: boss.map.y }, { x: bonusNode.map.x, y: bonusNode.map.y }] : null
  const phoneBonus: [Point, Point] | null =
    bonusNode && boss
      ? [
          { x: getPhonePosition(boss.map.x), y: getPhoneRowY(pathNodes.length - 1, rows) },
          { x: getPhonePosition(bonusNode.map.x), y: getPhoneRowY(rows - 1, rows) },
        ]
      : null

  return (
    <div className="relative mx-auto w-full max-w-[720px] px-3 sm:aspect-[4/5] sm:px-0">
      <QuestScene worldId={world.id} locked={!world.accessible} reducedMotion={reducedMotion} />
      <PathSvg points={phonePoints} done={done} bonus={phoneBonus} colors={colors} className="inset-y-0 left-3 right-3 h-full w-[calc(100%-1.5rem)] sm:hidden" />
      <PathSvg points={desktopPoints} done={done} bonus={desktopBonus} colors={colors} className="inset-0 hidden h-full w-full sm:block" />
      <ol className="relative flex flex-col-reverse sm:absolute sm:inset-0 sm:block">
        {ordered.map((node) => {
          const style = {
            '--qx': `${node.map.x}%`,
            '--qy': `${node.map.y}%`,
            '--px': `${getPhonePosition(node.map.x)}%`,
          } as CSSProperties
          return (
            <li
              key={node.id}
              style={style}
              className="relative h-24 sm:absolute sm:left-[var(--qx)] sm:top-[var(--qy)] sm:h-auto sm:-translate-x-1/2 sm:-translate-y-1/2"
            >
              <div className="absolute left-[var(--px)] top-1/2 -translate-x-1/2 -translate-y-1/2 sm:static sm:translate-x-0 sm:translate-y-0">
                <QuestNodeButton
                  node={node}
                  state={getNodeVisualState(node, world.accessible)}
                  reducedMotion={reducedMotion}
                  justUnlocked={justUnlocked?.has(node.id) ?? false}
                  onSelect={onSelect}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
