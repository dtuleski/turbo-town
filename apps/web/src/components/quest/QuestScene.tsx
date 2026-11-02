export interface QuestSceneProps {
  worldId: string
  /** Locked teaser worlds get a light misty overlay (never a dark one). */
  locked: boolean
  reducedMotion: boolean
}

export interface TrailColors {
  base: string
  outline: string
}

/** Trail colours per world: sand for the peaks, white for the island. */
export function getTrailColors(worldId: string): TrailColors {
  return worldId === 'science-island' ? { base: '#FFFFFF', outline: '#0F766E' } : { base: '#FEF3C7', outline: '#B45309' }
}

function Cloud({ className, drift }: { className: string; drift: boolean }) {
  return (
    <span aria-hidden="true" className={`absolute ${className} ${drift ? 'motion-safe:animate-quest-drift' : ''}`}>
      <span className="relative block h-8 w-24">
        <span className="absolute bottom-0 left-0 h-6 w-24 rounded-full bg-white" />
        <span className="absolute bottom-3 left-4 h-8 w-10 rounded-full bg-white" />
        <span className="absolute bottom-3 left-10 h-9 w-11 rounded-full bg-white" />
      </span>
    </span>
  )
}

function PeaksScene({ drift }: { drift: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-violet-200" />
      <span
        aria-hidden="true"
        className="absolute left-[5%] top-[2%] h-14 w-14 rounded-full bg-yellow-300 shadow-[0_0_0_10px_rgba(253,224,71,0.35),0_0_40px_14px_rgba(253,224,71,0.45)]"
      />
      <Cloud className="left-[16%] top-[13%]" drift={drift} />
      <Cloud className="left-[70%] top-[22%] scale-75" drift={drift} />
      <Cloud className="left-[14%] top-[46%] scale-90" drift={drift} />
      <Cloud className="left-[64%] top-[64%]" drift={drift} />
      <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polygon points="0,100 0,78 14,62 26,76 40,56 56,78 100,78 100,100" fill="#C4B5FD" />
        <polygon points="0,100 0,88 18,74 34,90 52,70 70,88 86,72 100,86 100,100" fill="#86EFAC" />
        <polygon points="0,100 0,95 30,88 60,96 100,90 100,100" fill="#4ADE80" />
        <polygon points="40,56 36,61 40,59 44,62" fill="#FFFFFF" />
      </svg>
    </>
  )
}

function IslandScene({ drift }: { drift: boolean }) {
  const wave = drift ? 'motion-safe:animate-quest-bob' : ''
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-200 via-cyan-300 to-teal-500" />
      <svg aria-hidden="true" focusable="false" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <ellipse cx="50" cy="52" rx="44" ry="44" fill="#FDE68A" />
        <ellipse cx="50" cy="52" rx="38" ry="38" fill="#FEF3C7" />
      </svg>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={`absolute inset-0 h-full w-full ${wave}`}
      >
        {[8, 30, 72, 94].map((y, index) => (
          <path
            key={y}
            d={`M ${index % 2 === 0 ? 4 : 56} ${y} q 6 -2 12 0 t 12 0 t 12 0 t 12 0`}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.75}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute right-[6%] top-[4%] text-5xl">
        {'\u{1F334}'}
      </span>
      <span aria-hidden="true" className="absolute left-[4%] top-[36%] text-5xl">
        {'\u{1F680}'}
      </span>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40" className="absolute bottom-[4%] left-[6%] h-12 w-12">
        <g fill="none" stroke="#7C3AED" strokeWidth={2.5}>
          <ellipse cx="20" cy="20" rx="17" ry="6.5" />
          <ellipse cx="20" cy="20" rx="17" ry="6.5" transform="rotate(60 20 20)" />
          <ellipse cx="20" cy="20" rx="17" ry="6.5" transform="rotate(-60 20 20)" />
        </g>
        <circle cx="20" cy="20" r="3.5" fill="#F97316" />
      </svg>
      <span aria-hidden="true" className="absolute bottom-[10%] right-[8%] text-5xl">
        {'\u{1F334}'}
      </span>
    </>
  )
}

/** Decorative per-world backdrop: CSS gradients, inline SVG and emoji only. Fully aria-hidden. */
export default function QuestScene({ worldId, locked, reducedMotion }: QuestSceneProps) {
  const drift = !reducedMotion
  return (
    <div aria-hidden="true" data-quest-scene={worldId} className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className={`absolute inset-0 ${locked ? 'saturate-50' : ''}`}>
        {worldId === 'science-island' ? <IslandScene drift={drift} /> : <PeaksScene drift={drift} />}
      </div>
      {locked && <div className="absolute inset-0 bg-white/50" />}
    </div>
  )
}
