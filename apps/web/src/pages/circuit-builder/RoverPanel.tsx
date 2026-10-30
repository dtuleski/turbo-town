import { useTranslation } from 'react-i18next'
import type { RoverRoleView, RoverView } from '@/utils/marsRover'

interface RoverPanelProps {
  view: RoverView
  reducedMotion: boolean
  className?: string
}

/** Matches the machine definition's role ids. Unknown roles still get a text row below. */
const ROLE_DRIVE = 'driveMotor'
const ROLE_HEADLIGHT = 'headlight'
const ROLE_BUZZER = 'buzzerAlert'
const ROLE_SOLAR = 'solarCharging'

/** Spokes of one wheel: the angle differs between on and off, so state is not colour alone. */
function Wheel({ cx, active, spin }: { cx: number; active: boolean; spin: boolean }) {
  const offset = active ? 45 : 0
  return (
    <g>
      <circle cx={cx} cy={88} r={16} className="fill-slate-800 stroke-slate-300" strokeWidth={3} />
      <g
        className={spin ? 'animate-spin' : undefined}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <g transform={`rotate(${String(offset)} ${String(cx)} 88)`}>
          {[0, 90, 180, 270].map((angle) => (
            <line
              key={angle}
              x1={cx}
              y1={88}
              x2={cx}
              y2={76}
              transform={`rotate(${String(angle)} ${String(cx)} 88)`}
              className="stroke-slate-300"
              strokeWidth={2}
            />
          ))}
        </g>
      </g>
    </g>
  )
}

function stateKey(role: RoverRoleView | undefined): string {
  if (role === undefined || !role.available) {
    return 'circuitBuilder.rover.unused'
  }
  return role.active ? 'circuitBuilder.rover.on' : 'circuitBuilder.rover.off'
}

/**
 * The Mars Rover drawn from SVG primitives. Every role has three cues that are not colour: a shape
 * change (spoke angle, beams, sound arcs, rays), a glyph, and a text row. Spinning wheels are the
 * only animation and only run when motion is allowed.
 */
export default function RoverPanel({ view, reducedMotion, className }: RoverPanelProps) {
  const { t } = useTranslation()
  const find = (id: string): RoverRoleView | undefined => view.roles.find((role) => role.roleId === id)

  const drive = find(ROLE_DRIVE)
  const headlight = find(ROLE_HEADLIGHT)
  const buzzer = find(ROLE_BUZZER)
  const solar = find(ROLE_SOLAR)

  const driveOn = drive?.active === true
  const headlightOn = headlight?.active === true
  const buzzerOn = buzzer?.active === true
  const solarOn = solar?.active === true

  return (
    <section
      className={['rounded-lg border border-slate-700 bg-slate-900 p-2', className ?? ''].join(' ').trim()}
    >
      <h3 className="mb-1 text-xs font-semibold text-slate-200">{t('circuitBuilder.rover.title')}</h3>
      <svg
        role="img"
        aria-label={t('circuitBuilder.rover.alt')}
        viewBox="0 0 240 120"
        className="h-auto w-full"
      >
        {/* Motion chevrons trail the rover while the drive motors run. */}
        {driveOn && (
          <g className="stroke-slate-300" fill="none" strokeWidth={2}>
            <polyline points="38,84 46,88 38,92" />
            <polyline points="26,84 34,88 26,92" />
          </g>
        )}

        <rect x={60} y={44} width={120} height={34} rx={6} className="fill-slate-700 stroke-slate-300" strokeWidth={2} />

        <Wheel cx={85} active={driveOn} spin={driveOn && !reducedMotion} />
        <Wheel cx={155} active={driveOn} spin={driveOn && !reducedMotion} />

        {/* Solar panel: a cell grid, with rays only while it delivers. */}
        <g opacity={solar?.available === true ? 1 : 0.35}>
          <rect x={112} y={26} width={40} height={14} className="fill-slate-800 stroke-slate-300" strokeWidth={2} />
          <line x1={125} y1={26} x2={125} y2={40} className="stroke-slate-300" strokeWidth={1} />
          <line x1={139} y1={26} x2={139} y2={40} className="stroke-slate-300" strokeWidth={1} />
          <line x1={112} y1={33} x2={152} y2={33} className="stroke-slate-300" strokeWidth={1} />
          {solarOn && (
            <g className="stroke-amber-200" strokeWidth={2}>
              <line x1={118} y1={20} x2={114} y2={12} />
              <line x1={132} y1={20} x2={132} y2={10} />
              <line x1={146} y1={20} x2={150} y2={12} />
            </g>
          )}
        </g>

        {/* Buzzer: a box, with sound arcs only while it sounds. */}
        <g opacity={buzzer?.available === true ? 1 : 0.35}>
          <rect x={72} y={32} width={22} height={12} rx={2} className="fill-slate-800 stroke-slate-300" strokeWidth={2} />
          {buzzerOn && (
            <g fill="none" className="stroke-amber-200" strokeWidth={2}>
              <path d="M98 34 Q102 38 98 42" />
              <path d="M102 31 Q108 38 102 45" />
              <path d="M106 28 Q114 38 106 48" />
            </g>
          )}
        </g>

        {/* Headlight: solid with beams when on, a dashed empty outline when off. */}
        <g opacity={headlight?.available === true ? 1 : 0.35}>
          {headlightOn ? (
            <>
              <polygon points="190,52 226,40 226,50" className="fill-yellow-200/70" />
              <polygon points="190,56 226,60 226,70" className="fill-yellow-200/70" />
              <circle cx={184} cy={54} r={7} className="fill-yellow-300 stroke-yellow-100" strokeWidth={2} />
            </>
          ) : (
            <circle
              cx={184}
              cy={54}
              r={7}
              fill="none"
              className="stroke-slate-300"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}
        </g>
      </svg>

      <ul className="mt-1 space-y-0.5 text-[11px] text-slate-200">
        {view.roles.map((role) => (
          <li key={role.roleId} className={role.available ? '' : 'text-slate-400'}>
            <span aria-hidden="true">{role.available ? (role.active ? '● ' : '○ ') : '– '}</span>
            {t(role.labelKey)}: {t(stateKey(role))}
          </li>
        ))}
      </ul>
      {view.allRequiredActive && (
        <p className="mt-1 text-[11px] font-semibold text-cyan-300">{t('circuitBuilder.rover.allPowered')}</p>
      )}
    </section>
  )
}
