# Quest Map: bright "fun" theme (visual-only change)

Owner request: "I don't like the dark background on the quest maps. Can we have something more fun?"
Scope: `apps/web` only. No behaviour, data, route, unlock, API or locale-key changes. Decorative elements are `aria-hidden`.

## Palette (Tailwind class / hex) and measured WCAG contrast

| Use | Foreground on background | Ratio |
|---|---|---|
| Node label name on white pill | slate-800 #1E293B on #FFFFFF | 14.63 |
| Sub text on white card | slate-600 #475569 on #FFFFFF | 7.58 |
| Sub text on cream | slate-600 on #FFFBEB | 7.31 |
| World title Brain Peaks | violet-800 #5B21B6 on white | 8.98 |
| World title Science Island | teal-800 #115E59 on white | 7.58 |
| World stars text | amber-800 #92400E on white | 7.09 |
| Earned star glyph (graphic) | amber-600 #D97706 on white | 3.19 (>= 3:1) |
| Empty star glyph | slate-500 #64748B on white | 4.76 |
| Available node icon | slate-900 #0F172A on orange-400 #FB923C | 7.89 |
| Earned node star | slate-900 on amber-300 #FCD34D | 12.38 |
| Locked node lock | slate-600 on slate-200 #E2E8F0 | 6.15 |
| Unavailable node icon | slate-600 on slate-100 #F1F5F9 | 6.92 |
| Subscribe CTA, paywall button | slate-900 on amber-400 #FBBF24 | 10.69 |
| Play button | slate-900 on emerald-400 #34D399 | 9.29 |
| Boss tag | rose-900 on rose-100 | 8.35 |
| Bonus tag | violet-900 on violet-100 | 9.23 |
| Notice | amber-900 on amber-50 | 8.75 |
| Plays bar fill vs track (graphic) | violet-600 #7C3AED vs slate-200 | 4.62 |
| Focus ring on cards | violet-700 #6D28D9 on white | 7.10 |
| Focus ring over scenes | slate-900 on sky-300 / teal-400 | 10.71 / 9.59 |

White text on orange-400 is only 2.26, so available nodes use a dark icon instead.
Trail colours: Brain Peaks sand #FEF3C7 with brown outline #B45309; Science Island white with teal outline #0F766E; completed segments green #4ADE80 with outline #166534 (both worlds).

## Per-world scene (CSS gradients + inline SVG + emoji, no assets)

- Brain Peaks: sky gradient #BAE6FD to #DDD6FE, CSS puffy clouds (drift), sun disc top-right with glow, two SVG mountain layers (purple #A78BFA, green #86EFAC/#4ADE80) along the bottom.
- Science Island: sea gradient #67E8F9 to #0D9488, sandy island blob (SVG ellipse #FDE68A) under the path, wave lines (bob), decorations palm tree, rocket, atom.
- Locked (FREE user, World 2): same scene softened by a light misty white overlay and reduced saturation; the "Subscribe to unlock" CTA stays in the world header as a large amber button.
- Clouds, waves and the available-node hop use keyframes added to `tailwind.config.js`; all are skipped when `reducedMotion` is true and are wrapped in `motion-safe:`.

## Per-component changes

- QuestMapView: removes the `bg-slate-950` panel; light page, white/cream rounded-2xl header card, light world header cards, light skeleton, amber-50 notice.
- QuestWorldPath: scene layer behind the path, rounded-2xl clip, thick outlined dashed trail, green completed segments, dotted bonus branch.
- QuestNodeButton: 56px nodes (boss 80px, bonus diamond 56px; the existing 48px/64px minimum classes stay), white 4px ring and drop shadow, state fills as above; crown (boss) and gift (bonus) are aria-hidden badges outside the button; label and stars sit on a white rounded pill. Accessible names, states and `border-dashed` for unavailable are unchanged.
- QuestNodePanel: white card, violet border, readable sub text, green play button.
- PlaysLeftBar, BadgeShelf, QuestHubCard, QuestBanner: light cards with the same accent colours.
- Unchanged: all texts, routes, hooks, utils, config.
