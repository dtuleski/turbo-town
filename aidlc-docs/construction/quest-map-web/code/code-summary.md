# Code Summary - QM3 Web Map, Launch and Result (apps/web)

Branch `feat/quest-map`. Basis: `quest-map-web-functional-design.md` (FD) and `.agents/tasks/qm3/plan.md`.
The server decides stars, unlocks, World 2 access and remaining plays; the web renders and launches.

## Created
| File | Purpose |
|---|---|
| `src/utils/questShared.ts` | Only file naming `packages/shared/src/quest` (per-file imports of types, config, themes; no zod `schema.ts`). Same funnel pattern and deployment warning as `circuitEngine.ts` |
| `src/types/quest.ts` | Web copies of `QuestProgressView`, `QuestWorldView`, `QuestNodeView`, `QuestResultPayload`, `LegView` (GraphQL response shape) |
| `src/utils/questLaunch.ts` | `parseQuestParam`, launch table (19 themeIds, 13 pages), `buildLaunchUrl`, `getGameNameKey`, `resolveGameSettings` (Memory Match URL fallback) |
| `src/utils/questResultStore.ts` | In-memory store of the last `completeGame.quest` + `useQuestResult()` |
| `src/api/quest.ts` | `getQuestProgress()` (network-only; `catalogGameId` never selected) |
| `src/utils/questMap.ts` | Pure map logic: visual state, aria parts, icons, phone clamp, frontier, path `d`, completed segments, play label, leg to run, play URL, panel form, `resolveStartFailed` |
| `src/utils/questModal.ts` | `isQuestMode`, `getNextLegUrl` (R2) |
| `src/hooks/useQuestProgress.ts` | Loads the view; no stale data while loading; logs status only |
| `src/components/quest/*` | `PlaysLeftBar`, `QuestNodeButton`, `QuestWorldPath`, `QuestNodePanel`, `QuestHubCard`, `QuestBanner` (+ `QuestBannerView`), `QuestResultSection`, `questText.ts` |
| `src/pages/quest/QuestMapPage.tsx` | Route page + presentational `QuestMapView` |
| `src/test/questFixtures.ts`, `src/test/renderWithProviders.tsx` | Test fixtures and SSR render helper (real i18next with en) |

## Modified
| File | Change |
|---|---|
| `src/config/constants.ts` | `ROUTES.QUEST_MAP = '/quest-map'` |
| `src/App.tsx` | Protected route for `QuestMapPage` inside the AppLayout group |
| `src/api/game.ts` | `questContext` sent from a valid `quest` URL param; R1 (quest start failure -> `window.location.replace('/quest-map?startFailed=rate|quest')`, never-settling promise; accepted quest start with non-empty id -> `canPlay: true`); result store cleared on every start; `quest` selection on `COMPLETE_GAME` stored/cleared; `isRateLimitError`. Non-quest behaviour unchanged |
| `src/components/game/ScoreBreakdownModal.tsx` | R2, internal only (no prop change): quest section, no Play again, Back to map, Next leg in a boss run, X/overlay/Close navigate to the map |
| `src/components/layout/AppLayout.tsx` | `<QuestBanner />` between Header and main (renders only in quest mode) |
| `src/pages/hub/GameHubPage.tsx` | `<QuestHubCard />` above the games grid (import + one element) |
| `src/pages/game/GamePage.tsx` | Memory Match reads `?theme=&difficulty=` when router state is empty |
| `src/pages/circuit-builder/CircuitBuilderGamePage.tsx` | Hides Next level / Back to setup in the result panel in quest mode |
| `src/locales/{en,es,pt}.json` | `quest` block (appended; existing lines untouched) |
| `src/__tests__/circuitBuilderRegistry.test.ts` | The pre-existing failure was caused by this branch (QM2 moved the paid list to shared `PAID_GAME_THEME_IDS`); the check now reads the list the start gate actually uses, with two mutation proofs |

The other 11 game pages and the 22 `ScoreBreakdownModal` importers are not edited.

## Tests (vitest, node environment, SSR markup; no new dependency)
`utils/__tests__/questLaunch.test.ts`, `questResultStore.test.ts`, `questMap.test.ts`; `api/__tests__/gameQuest.test.ts`, `quest.test.ts`; `locales/__tests__/questLocaleCompleteness.test.ts`; `components/quest/__tests__/QuestMap.test.tsx`, `QuestHubCard.test.tsx`, `QuestBanner.test.tsx`, `QuestResultSection.test.tsx`; `components/game/__tests__/ScoreBreakdownModal.quest.test.tsx`.
Result: 42 files, 810 tests, all pass (baseline 31 files, 629 tests, 1 failure now fixed).

## Decisions
- No "Next node" shortcut (FD section 4 decision D). The brief mentioned "Next node if unlocked"; the approved FD overrides it: Back to map always, Next leg only inside a boss run, and the modal names what unlocked.
- Minimal unlock animation: the map reads `newlyUnlocked` once on mount (then clears the store): scale pop via framer-motion, plus a static dashed ring and a "New" marker that remain under reduced motion. QM4 may extend it.
- Paywall is server-side; the client only hides Play for an inaccessible world and links to the subscription page. R1 forces `canPlay: true` only after the server accepted the start (non-empty id).

## Manual checks still open (FD section 8)
Keyboard order and focus return on a real device, screen-reader names, reduced-motion OS setting, 200% zoom, opening each of the 13 pages from a node against a live backend. A headless Chrome render of mocked data at 1280, 375 and 320px was checked (no horizontal overflow at 320px).

## Open items
- Vercel relative-import deployment risk shared with Circuit Builder (`questShared.ts` header).
- Page difficulty params: all 12 non-card pages read `?difficulty=` (`easy|medium|hard`); Geo Quiz and Space Entry confirmed by reading the pages.
- Auth expiry on the map surfaces as the map error state; not verified live.
- `npm run lint` for the whole app has 114 pre-existing problems; the files of this unit lint clean except three pre-existing findings in edited files (`ScoreBreakdownModal` empty catch, two hook-deps warnings in `GamePage`/`GameHubPage`).
