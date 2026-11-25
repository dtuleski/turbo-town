# Math Rally - Component Methods

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design
**Revision**: iteration 4, after the third design review of 2026-11-25. Changed in iteration 4: fatal-error guard (`core/fatalErrorGuard.ts`, `embed/pageGuard.ts`, `EngineOptions.errorGuard`); built-in texture check in `BootScene.create()`; Phaser's default local schemes and built-in texture keys as literals in `core/engineConfig.ts`; host failure kinds by phase; the app's `backAction` rule. Responses per finding: `math-rally-components.md` Section 11. Changed in iteration 3: one-frame margin in the window layout contract and a corrected floor argument; Phaser built-in textures from bundled files (`engineConfigFields`); local update-message copy in `api/game.ts`; `mathRallyProtocol` passed through as `unknown` and checked in the service; `.css` in the iOS MIME table; markup and `sys/` checks in the embed build. Iteration 2 changed: protocol registry and freeze rule, canonical option grammar and value comparison, shared motion and expected-time functions, score without client time, `touchUi` in `init`, `correctCount` in the Dart message, source hash in the embed build. Responses per finding: `math-rally-components.md` Sections 9 and 10.
**Note**: Signatures and contracts only. Numbers marked *FD* (Functional Design) are chosen per unit in Construction within the stated constraints; every constraint here is testable. Phaser method and setting names follow the Phaser 3 API and are confirmed against Phaser 4 in MR1 (U1).

---

## 1. Shared race core (`packages/shared/src/math-rally/`, MR2)

### Types (S6)
```ts
export type MathRallyDifficulty = 1 | 2 | 3 | 4;
export type QuestionKind =
  | 'add' | 'sub'                                   // difficulty 1 and 2
  | 'mul' | 'div'                                   // difficulty 2
  | 'twoStep' | 'fractionOf' | 'percentOf' | 'square' // difficulty 3
  | 'negArith' | 'fracAdd' | 'percentOfAny' | 'power' | 'sqrt' | 'equation'; // difficulty 4

export interface MathRallyQuestion {
  kind: QuestionKind;
  operands: readonly number[];       // integers, |value| <= 1000, at most 4; meaning fixed per kind and protocol version
  options: readonly string[];        // `paths` canonical strings, pairwise distinct by value (see "Options" below)
  correctIndex: number;              // 0 .. paths-1
}
export interface MathRallyRacePayload {
  protocolVersion: number;           // version the race was built with (= startGame's mathRallyProtocol)
  difficulty: MathRallyDifficulty;
  forks: number; paths: 2 | 3 | 4; readSeconds: number;
  questions: readonly MathRallyQuestion[]; // length === forks
}
export interface MathRallyGameRecord {
  seed: number; protocolVersion: number; paths: number; forks: number;
  key: readonly number[];            // correctIndex per fork
}
export interface MathRallySubmission { choices: readonly number[]; forkTimesMs: readonly number[] }
```

### Options: canonical form and exact values (S3, S4; FR-MK-14, FR-MK-15)
```ts
export const INTEGER_OPTION: RegExp;   // /^(0|-?[1-9][0-9]{0,2})$/   -999..999, no leading zero, no "-0"
export const FRACTION_OPTION: RegExp;  // /^-?[1-9][0-9]?\/[1-9][0-9]?$/  one- or two-digit parts
export function isCanonicalOption(s: string): boolean;   // length <= 4 and matches one of the two patterns
export interface Exact { num: number; den: number }      // den > 0 and gcd(|num|, den) === 1; den === 1 for integers
export function parseOption(s: string): Exact | null;     // reduces: "2/4" -> { num: 1, den: 2 }; null if not canonical
export function sameValue(a: Exact, b: Exact): boolean;   // num and den equal (both reduced)
export function formatExact(v: Exact): string;            // lowest terms; den 1 -> integer: "56", "-7", "3/4"
```
- Options are compared only by value (`parseOption` then `sameValue`), never as strings.
- The correct option is always `formatExact(answer)`: lowest terms, and an integer when the value is whole (never `4/2`).
- A distractor may be written in non-lowest terms (the "1/2 + 1/4 = 2/6" mistake) only when its value differs from the answer and from every other option of the fork.
- The swapped-digits rule skips any result with a leading zero (50 never becomes "05"); every rule's result is dropped when it is not canonical.
- A question whose correct answer is not canonical (for example a power above 999) is never generated; the generator redraws operands.

### Protocol registry (S1; FR-MK-18, FR-MK-26, NFR-MK-23)
```ts
export const MATH_RALLY_THEME_ID = 'MATH_RALLY';
export const MR_CLIENT_PROTOCOL = 1;                    // version this build of the game speaks; sent in `ready`
export const MR_SUPPORTED_PROTOCOLS: readonly number[]; // Object.freeze([1]); versions the Game Service builds and checks
export const MATH_RALLY_UPDATE_REQUIRED_MESSAGE = 'Please update the app to play.';

export interface TrackConstants {
  segmentLength: number;            // world units per segment (FD)
  accel: number;                    // units/s^2 from "Go" up to cruise (FD)
  cruiseSpeed: number;              // units/s (FD)
  maxSpeed: number;                 // boost speed (FD)
  slowFactor: 0.6;                  // wrong-branch speed = slowFactor x cruiseSpeed
  boostSeconds: number;             // about 1 (FD)
  slowSeconds: number;              // about 1.5 (FD)
  approachLength: number; branchLength: number; gapLength: number; finishLength: number; // FD
  timingToleranceMs: number;        // set by the AC-30.2 property test (FD; expected tens of ms, at most 250)
}
export interface ProtocolSpec {
  version: number;
  params: Readonly<Record<MathRallyDifficulty, { paths: 2 | 3 | 4; forks: number; readSeconds: number }>>;
  // v1: { 1: {2,10,8}, 2: {3,12,7}, 3: {4,15,6}, 4: {4,15,5} } (requirements Section 4.0)
  track: Readonly<TrackConstants>;
  kinds: Readonly<Record<MathRallyDifficulty, readonly QuestionKind[]>>;
  generateQuestion(rng: Rng, difficulty: MathRallyDifficulty, kind: QuestionKind): GeneratedQuestion; // operand rules
  buildOptions(rng: Rng, q: GeneratedQuestion, difficulty: MathRallyDifficulty, paths: number): string[]; // correct first
}
export function protocolSpec(version: number): ProtocolSpec | null;   // null for any version not registered
```
**Freeze rule.** Each protocol version lives in its own folder (`math-rally/v1/`: `params.ts`, `track.ts`, `questions.ts`, `distractors.ts`, `index.ts` exporting `PROTOCOL_V1`). Before launch everything in it may be tuned. From the launch commit on, nothing reachable from `PROTOCOL_V1` may change behaviour; a change ships as `v2/` (started as a copy), registered next to v1, with `MR_CLIENT_PROTOCOL` raised to 2 and 2 added to `MR_SUPPORTED_PROTOCOLS`. Removing a version from `MR_SUPPORTED_PROTOCOLS` is an owner decision (NFR-MK-23). Enforcement: two golden fixtures per version, `__fixtures__/protocol-v1-races.json` (`buildRace` for seeds 1 to 25 at each difficulty) and `__fixtures__/protocol-v1-times.json` (`expectedRaceTimesMs` for all-right, all-wrong and two alternating patterns at each difficulty). A test fails on any difference. The fixture script (`packages/shared/scripts/write-math-rally-fixtures.mjs`) refuses to overwrite a fixture whose top-level `"frozen"` field is `true`; pre-launch check PL8 sets it. Shared helpers that the generator uses (`rng.ts`, `exact.ts`) are covered by the same fixtures.

### Track layout (S1)
```ts
export interface TrackLayout {
  questionStart: readonly number[]; decisionLine: readonly number[]; mergeEnd: readonly number[];
  finishLine: number;
}
export function trackLayout(spec: ProtocolSpec, difficulty: MathRallyDifficulty): TrackLayout;
```
Contracts (unit tests for every supported version and difficulty; FR-MK-8, FR-MK-11, FR-MK-12, FR-MK-30):
- `(decisionLine[k] - questionStart[k]) / maxSpeed >= readSeconds` for every k.
- `mergeEnd[k] < questionStart[k + 1]`.
- `(branchLength + gapLength) / maxSpeed >= 1.5` (the correct answer stays visible at least 1.5 s after a wrong pick).
- `cruiseSpeed^2 / (2 x accel) < decisionLine[0]` (acceleration ends before the first decision line).
- `max(maxSpeed x boostSeconds, slowFactor x cruiseSpeed x slowSeconds) + maxSpeed x 0.05` is smaller than every gap `decisionLine[k + 1] - decisionLine[k]` and than `finishLine - decisionLine[N - 1]`. The first term is the distance of a boost or slowdown window; `maxSpeed x 0.05` is the most the kart can travel in one clamped frame (50 ms). So no window, opened on time or up to one frame late, reaches the next decision line or the finish, and no line lies within one frame's travel after a window ends.

### Motion and expected times (S1 `motion.ts`, `timing.ts`; FR-MK-30)
The game (G5) and the server use the same functions, so they cannot disagree on how the kart moves.
```ts
export interface Motion { kinMs: number; position: number; boostUntilMs: number; slowUntilMs: number }
export function initialMotion(): Motion;                                 // at "Go": all zero, no window open
export function speedAt(m: Motion, atKinMs: number, track: TrackConstants): number;
// min(cruiseSpeed, accel x t) outside windows; maxSpeed inside a boost; slowFactor x cruiseSpeed inside a slowdown
export function advanceMotion(m: Motion, dtMs: number, track: TrackConstants): Motion;
// exact integration over [kinMs, kinMs + dtMs]: the interval is split at the end of acceleration and at
// window ends; linear within the acceleration piece, constant elsewhere. Precondition 0 <= dtMs <= 50.
export function applyOutcome(m: Motion, correct: boolean, track: TrackConstants): Motion;
// opens a boost (correct) or slowdown (wrong) window starting at m.kinMs

export function expectedRaceTimesMs(version: number, difficulty: MathRallyDifficulty, correct: readonly boolean[]):
  { forkTimesMs: number[]; finishMs: number } | null;   // null for an unknown version or a wrong-length array
// continuous-time solution in closed form (no frame loop): each line is crossed at its exact time and each
// window opens at that exact time; returned values are Math.floor of the exact milliseconds
export function isPlausibleTiming(
  sub: { forkTimesMs: readonly number[]; completionTimeMs: number },
  expected: { forkTimesMs: readonly number[]; finishMs: number }, toleranceMs: number): boolean;
// true iff every sub.forkTimesMs[k] >= expected.forkTimesMs[k] - toleranceMs
//      and sub.completionTimeMs >= expected.finishMs - toleranceMs
```
**Frame rule (owned by G5, stated here because the floor depends on it).** Each running frame: `dt = clamp(clock.elapsedMs(now) - lastElapsed, 0, 50)`, where `lastElapsed` is the clock reading of the previous running frame. The clock excludes paused time, so the first frame after a resume never carries the pause. Motion advances with `advanceMotion(m, dt)`. A decision line or the finish counts as crossed at the end of the first frame in which `position` reaches it; the recorded time is `clock.elapsedMs(now)` of that frame; `applyOutcome` runs in the same frame. Phaser's smoothed `delta` is never used for motion or timing.

**Why honest play never falls below the floor.** Positions are compared at the same kinematic time (race time with paused and clamped-away time removed). Kinematic time never exceeds clock time, because the clamp only removes time. Integration inside a frame is exact, so the frame-by-frame kart differs from the exact solution only because a window opens at the end of the frame in which the kart crossed the line, up to one frame (a lag of at most 50 ms of kinematic time) after the exact crossing:
- Late boost: during the lag before it opens the kart still runs at cruise speed, so it falls behind the exact kart; it stays behind while both windows run and catches up during the lag after the exact window ends.
- Late slowdown: during the lag before it opens the kart still runs at cruise speed, so it is ahead of the exact kart by up to `(1 - slowFactor) x cruiseSpeed x lag` (0.4 x cruiseSpeed x 0.05 at most). It stays ahead while both windows run, and the lead closes during the lag after the exact window ends.
- Once both windows have ended, the frame-by-frame position equals the exact position at the same kinematic time, so nothing carries over to the next fork.

The kart is ahead of the exact solution only during a late slowdown and up to one frame after the exact window ends. The layout contract puts every decision line and the finish beyond that span: beyond the window distance plus one frame's travel at top speed. So at every line the frame-by-frame kart reaches the line at the same kinematic time as the exact kart or later. Its recorded clock time is at or after that kinematic time, hence at or after the exact time. The tolerance only absorbs floating-point and integer rounding.

**Property test (AC-30.2, `motion.property.test.ts`, Jest and `fast-check`, 1000 runs per difficulty):** random right/wrong sequence; frame deltas drawn from [1, 50] ms, with 10% of frames drawn from [51, 500] ms to exercise the clamp; up to 3 pauses of random length at random frames. A harness applies the frame rule above with a clock that sums frame deltas outside pauses. Assertion: `isPlausibleTiming(recorded, expectedRaceTimesMs(...), track.timingToleranceMs)` is true. FD sets `timingToleranceMs` to the smallest round value (multiple of 10 ms) for which the test passes, plus 50 ms margin, and never above 250 ms.

### RNG, questions, race (S2, S3, S5)
```ts
export interface Rng { nextUint32(): number; nextInt(minIncl: number, maxIncl: number): number;
  pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[] }
export function createRng(seed: number): Rng;                 // mulberry32; seed coerced with >>> 0
export interface GeneratedQuestion { kind: QuestionKind; operands: number[]; answer: Exact }

export interface MathRallyRace { payload: MathRallyRacePayload; record: MathRallyGameRecord }
export function buildRace(seed: number, difficulty: MathRallyDifficulty, version: number): MathRallyRace;
// throws RangeError for an unregistered version (callers check MR_SUPPORTED_PROTOCOLS first)
```
Contracts (property tests with `fast-check`, 1000 seeds per difficulty for every supported version):
- Deterministic: same seed, difficulty and version give deep-equal races; no `Math.random`, `Date` or I/O (lint rule plus a test that stubs both and asserts they are not called).
- `questions.length === forks`; prompts (kind plus operands) pairwise distinct (FR-MK-17).
- Each fork: `options.length === paths`; every option `isCanonicalOption`; the options' values are pairwise distinct; exactly one is value-equal to the answer, it sits at `correctIndex`, and it equals `formatExact(answer)` (FR-MK-7, FR-MK-14, AC-15.2).
- No negative option or answer below difficulty 4; no decimal anywhere; integers within -999..999 (FR-MK-13, FR-MK-14).
- At least one distractor comes from a mistake rule when a rule applies to the kind (AC-15.1).
- Position balance and runs: over 10 000 forks per path count, each position's share within 2 points of `1 / paths`; no run longer than 3 (FR-MK-16). Placement: draw a position uniformly; if it would make a fourth repeat, redraw from the other positions.
- `record.key[k] === payload.questions[k].correctIndex`; `record.protocolVersion === payload.protocolVersion === version`.
- `buildRace` never throws for an integer seed, a valid difficulty and a supported version; if the rules cannot produce enough distinct canonical options it falls back to near values within range (tested with exhaustive small-range cases).
- Golden fixtures match (freeze rule above).

### Free-tier gate (S7, `packages/shared/src/constants/paid-games.ts`)
```ts
export const FREE_DIFFICULTIES_IN_PAID_GAMES: Readonly<Record<string, readonly number[]>>;
// Object.freeze({ MATH_RALLY: Object.freeze([1]) })
export function isBlockedForFreeTier(
  themeId: string, difficulty: number,
  paidThemeIds: readonly string[] = PAID_GAME_THEME_IDS,
  exceptions: Readonly<Record<string, readonly number[]>> = FREE_DIFFICULTIES_IN_PAID_GAMES
): boolean; // true when themeId is paid and difficulty is not in exceptions[themeId]
```
The difficulty-4 rule for FREE users stays a separate check in `startGame`, so an exception can never open Super Hard to FREE users unless that rule is changed too.

---

## 2. Game core (`apps/web/src/games/math-rally/`, MR1 and MR4)

### Engine facade (G1)
```ts
export interface EngineOptions {
  assetBaseUrl: string;           // '/games/math-rally/' on web, './' in the app bundle
  buildId: string;                // ^[A-Za-z0-9._-]{1,40}$; web 'web', app 'app-' + first 12 hex of sourceHash
  localSchemes?: readonly string[]; // app bundle: ['dashden-game://'] (G16); merged into the loader's local schemes
  errorGuard?: FatalErrorGuard;   // app bundle: the guard of embed/pageGuard.ts (G16); web: absent, mount creates one
  devOverlay?: boolean;           // ignored unless compiled in dev or in the local gate mode (G17)
}
export interface EngineHandle { destroy(): void }       // idempotent; never throws
export function mountMathRally(parent: HTMLElement, channel: HostChannel, options: EngineOptions): EngineHandle;
export function hasWebGL(): boolean;                     // probe used by hosts before mounting
```
`mountMathRally` throws `EngineStartError` (no message details) when Phaser cannot create a renderer; the host catches it (Section 5 of the services file).

```ts
// core/fatalErrorGuard.ts (G1, pure: type-only imports, so embed/pageGuard.ts can evaluate it before any other module)
export type GameErrorCode = 'ENGINE_START_FAILED' | 'ASSET_LOAD_FAILED' | 'CONTEXT_LOST' | 'INIT_INVALID' | 'INTERNAL';
export interface FatalErrorGuard {
  setStop(stop: () => void): void;   // G1 sets it once the Phaser game exists
  markReady(): void;                  // G1 calls it when a `ready` message passes through its wrapper of channel.send
  report(code?: GameErrorCode): void; // first call only: stop() (a throw is swallowed), then send
                                      // error{ code ?? (ready ? 'INTERNAL' : 'ENGINE_START_FAILED') } (a throw is swallowed);
                                      // every later call does nothing
  dispose(): void;                    // after this, report() does nothing
  tripped(): boolean;
}
export function createFatalErrorGuard(send: (message: GameError) => void): FatalErrorGuard;
export function installPageErrorListeners(target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  guard: FatalErrorGuard): () => void;
// adds 'error' and 'unhandledrejection' listeners in the bubble phase, each calling guard.report();
// returns a function that removes both. No preventDefault: the browser still logs the error in the console.
```
- On web, `mountMathRally` creates the guard around the channel's `send`, installs the listeners on `window`, and its `destroy()` removes them and disposes the guard. On the app page it uses `options.errorGuard`, whose listeners `embed/pageGuard.ts` installed first, and does not install a second set (one guard per page, so at most one message).
- The stop action G1 sets: `game.loop.stop()`, `game.sound.stopAll()` and clearing the live region (Phaser 3 names, Phaser 4 equivalents confirmed in MR1 step 1, U21). The host then tears the engine down as on any failure path.
- Every `error` the game core sends (BootScene, `init` validation, context loss, the scenes' `update` try/catch) calls `guard.report(code)` instead of `channel.send`.
- Unit tests (Vitest, node, AC-44.3): two reports give one message; the code is `ENGINE_START_FAILED` before `markReady()` and `INTERNAL` after, or the code given; a throwing `stop` or `send` neither escapes nor causes a second message; nothing after `dispose()`; on a plain `new EventTarget()`, dispatching `error` and `unhandledrejection` events reaches the guard, and after the remover runs neither does.

```ts
// embed/pageGuard.ts (G16): first import of embed/main.ts
export const pageGuard: FatalErrorGuard;      // createFatalErrorGuard(holdThenSend)
export function attachChannel(channel: HostChannel): void; // holdThenSend keeps at most one message until this call
// module body: installPageErrorListeners(window, pageGuard); in gate mode also installViolationRecorder(document) (G17)
```

```ts
// core/engineConfig.ts (G1, pure, no Phaser import): the CSP-relevant part of the Phaser game config, used by both hosts
export interface EngineConfigFields {
  images: { default: string; missing: string; white: string };   // Phaser 3 keys images.default / .missing / .white
  loader: { imageLoadType: 'HTMLImageElement'; localScheme: string[] };
}
export const PHASER_DEFAULT_LOCAL_SCHEMES: readonly string[] = ['file://', 'capacitor://'];
// Phaser 3's default loader.localScheme, from knowledge of its source (U19); MR1 step 1 confirms the Phaser 4 default
// and updates this literal (the module cannot read Phaser's value because it imports no Phaser)
export const BUILTIN_TEXTURE_KEYS: readonly string[] = ['__DEFAULT', '__MISSING', '__WHITE'];
// Phaser 3 names; MR1 step 1 confirms the Phaser 4 names and updates this literal; G2 checks them before `ready`
export function engineConfigFields(options: EngineOptions): EngineConfigFields;
// images.* = options.assetBaseUrl + 'sys/default.png' | 'sys/missing.png' | 'sys/white.png'
// loader.localScheme = [...PHASER_DEFAULT_LOCAL_SCHEMES, ...(options.localSchemes ?? [])], duplicates removed, order kept
```
- Images load as `HTMLImageElement` (Phaser 3 setting `loader.imageLoadType`), so the loader creates no `blob:` URLs (F6, NFR-MK-17, U5).
- Phaser's built-in default, missing and white textures load from the bundled `sys/` files instead of its `data:` defaults (U20). Phaser 3 sets each of them as the `src` of an `Image` during `TextureManager.boot`, so a path works as well as a data URI. The files are original PNGs listed in `CREDITS.json`: `white.png` 4 x 4 opaque white, `default.png` 32 x 32 transparent, `missing.png` 32 x 32 simple pattern.
- Unit test (Vitest, node): for web and app options, every `images` value starts with `assetBaseUrl + 'sys/'`, `imageLoadType` is `HTMLImageElement`, the local schemes are the default list followed by `options.localSchemes` with no duplicate (also when a given scheme repeats a default), and no string in the result starts with `data:` or `blob:`.
- If Phaser 4 lacks either setting, MR1 records it (U5, U20) and the documented fallback of NFR-MK-17 applies: `blob:` or `data:` in `img-src` (and `media-src`) only.

### Pure core modules (G5, G7, G10, G11, `core/joystick.ts`, `core/projection.ts`)
```ts
// Lanes (G7)
export interface LaneState { count: number; lane: number }
export function moveLane(s: LaneState, action: 'left' | 'right'): LaneState; // clamped
export function resizeLanes(s: LaneState, newCount: number): LaneState;    // nearest valid lane

// Joystick model and visibility (G8)
export interface JoystickConfig { thresholdRatio: number; repeatDelayMs: number; repeatIntervalMs: number } // FD, e.g. 0.35, 400, 250
export interface JoystickState { active: boolean; side: -1 | 0 | 1; nextRepeatAt: number | null }
export function joystickStep(s: JoystickState, input: { dxRatio: number | null; nowMs: number }, c: JoystickConfig):
  { state: JoystickState; actions: ('left' | 'right')[] };                // null dx = released
export function joystickVisible(touchUi: boolean, touchSeen: boolean): boolean; // touchUi || touchSeen

// Race clock (G10)
export interface RaceClock { start(nowMs: number): void; pause(nowMs: number): void; resume(nowMs: number): void;
  elapsedMs(nowMs: number): number; isRunning(): boolean }
export function createRaceClock(): RaceClock;                              // integer ms (floor), paused time excluded

// Track runtime (G5): thin adapter over S1 motion, applies the frame rule of Section 1
export type TrackEvent = { type: 'questionStart' | 'decisionLine' | 'merge'; fork: number; atMs: number }
  | { type: 'finish'; atMs: number };
export interface TrackRuntime {
  frame(clockElapsedMs: number): TrackEvent[];   // dt from the clock reading, clamped to [0, 50]
  applyOutcome(correct: boolean): void;          // called by G6 in the frame of the decisionLine event
  motion(): Motion;                              // for rendering (position, speed)
}
export function createTrackRuntime(spec: ProtocolSpec, difficulty: MathRallyDifficulty): TrackRuntime;

// Quality (G11)
export type QualityProfile = 'high' | 'low';
export function chooseProfile(current: QualityProfile, frameTimesMs: readonly number[]): QualityProfile;
// 'low' when current is 'high', at least 120 samples, median > 20; never returns to 'high'

// Projection (G4)
export interface Camera { x: number; y: number; z: number; depth: number }
export function projectPoint(worldX: number, worldY: number, worldZ: number, cam: Camera,
  viewW: number, viewH: number, roadWidth: number): { x: number; y: number; w: number; scale: number };
export function branchOffset(distanceIntoFork: number, branchIndex: number, paths: number): number; // lateral offset, 0 at split and merge
```
G5 unit test: with an injected clock whose readings differ from the Phaser `delta` passed to the scene, motion follows the clock readings only.

### Fork controller (G6)
```ts
export interface ForkOutcome { fork: number; choice: number; correct: boolean; atMs: number }
export interface ForkController {
  current(): { fork: number; question: MathRallyQuestion } | null;
  onDecisionLine(lane: number, atMs: number): ForkOutcome;      // records choice and time once per fork
  coins(): number;                                              // === number of correct outcomes
  submission(): { choices: number[]; forkTimesMs: number[] };   // only after the last fork
}
export function createForkController(race: MathRallyRacePayload): ForkController;
```

### Phaser scenes (G2, G3, G9) - lifecycle hooks only
```ts
class BootScene extends Phaser.Scene { preload(): void; create(): void }
// preload: atlases and sounds through the loader, the font through FontFace; any failure -> guard.report('ASSET_LOAD_FAILED')
// create: if BUILTIN_TEXTURE_KEYS.some(k => !this.textures.exists(k)) -> guard.report('ASSET_LOAD_FAILED'), no ready;
//         otherwise channel.send(ready)
class RaceScene extends Phaser.Scene { init(data: RaceInit): void; create(): void; update(time: number, delta: number): void;
  setSignsVisible(visible: boolean): void }
class HudScene  extends Phaser.Scene { create(): void; showQuestion(q: MathRallyQuestion): void;
  showFeedback(o: ForkOutcome, reveal: string): void; setPaused(paused: boolean): void }
interface RaceInit { race: MathRallyRacePayload; language: 'en' | 'es' | 'pt'; sound: boolean; reducedMotion: boolean;
  touchUi: boolean; scored: boolean }
```
`HudScene.setPaused(true)` (FR-MK-22, AC-22.3): draws a full-screen panel with alpha 1 above both scenes, hides the question banner and the lane chips, asks RaceScene to hide the signs (`setSignsVisible(false)`, so nothing shows even if the panel changes later), and clears the live region text. `setPaused(false)` restores all of them; the reading window continues because the kart did not move while paused. A pause during the countdown freezes the countdown.

### Game text (G13)
```ts
export type GameLanguage = 'en' | 'es' | 'pt';
export function promptText(q: Pick<MathRallyQuestion, 'kind' | 'operands'>, lang: GameLanguage): string;
export function revealText(q: MathRallyQuestion, lang: GameLanguage): string;   // "7 x 8 = 56"
export function uiText(key: GameTextKey, lang: GameLanguage): string;
```

---

## 3. Web host (`apps/web/src/`, MR4)

```ts
// api/game.ts (H4)
export interface MathRallyStartResult extends StartGameResult { mathRally: unknown } // validated by the game
export const startMathRallyGame: (input: { themeId: 'MATH_RALLY'; difficulty: 1 | 2 | 3 | 4;
  mathRallyProtocol: number }) => Promise<MathRallyStartResult>;
// shares the internal runStart(document, input) with startGame, so the quest param and rule R1 apply
const MATH_RALLY_UPDATE_REQUIRED_MESSAGE = 'Please update the app to play.';
// local copy: api/game.ts is imported by eager pages and must not import the shared race module or the funnel H5;
// H9 checks this literal against the shared constant (as it does for the Dart copy)
export function isUpdateRequiredError(error: unknown): boolean;  // message === MATH_RALLY_UPDATE_REQUIRED_MESSAGE
export interface MathRallySubmissionInput { choices: number[]; forkTimesMs: number[] }
// CompleteGameInput gains: mathRallySubmission?: MathRallySubmissionInput

// pages/math-rally/levelLocks.ts (H3)
export type LevelLock = 'playable' | 'lockedPaid';
export function lockState(difficulty: 1 | 2 | 3 | 4,
  ctx: { tier: string; gameIsPaid: boolean; freeDifficulties: readonly number[] }): LevelLock;
// lockedPaid when tier === 'FREE' and (difficulty === 4 or (gameIsPaid and difficulty not in freeDifficulties))

// pages/math-rally/hostEnv.ts (H2 helpers, pure)
export function gameLanguage(i18n: { resolvedLanguage?: string; language?: string }): 'en' | 'es' | 'pt';
// (resolvedLanguage ?? language ?? 'en').slice(0, 2) -> 'en' | 'es' | 'pt', anything else 'en' ('pt-BR' -> 'pt')
export function initialTouchUi(win: Pick<Window, 'matchMedia' | 'navigator'>): boolean;
// win.matchMedia('(any-pointer: coarse)').matches || win.navigator.maxTouchPoints > 0
export function parseGameSearch(search: string): { difficulty: 1 | 2 | 3 | 4 } | null;
// accepts difficulty=easy|medium|hard|superhard only; anything else -> null (redirect to setup)

// pages/math-rally/useMathRallyHost.ts (H2)
export const READY_TIMEOUT_MS = 20_000;
export type HostPhase = 'loadingEngine' | 'starting' | 'racing' | 'paused' | 'submitting'
  | 'result' | 'saveFailed' | 'rejected' | 'failed';
export type HostFailure = 'noWebGL' | 'engine' | 'assets' | 'timeout' | 'start' | 'updateRequired'
  | 'payload' | 'contextLost' | 'internal' | 'boot';
// 'engine' is the EngineStartError thrown by mountMathRally. A game `error` maps by phase (services Section 2):
// loadingEngine -> 'assets' (ASSET_LOAD_FAILED) or 'boot' (any other code); both show "The race could not load." with Retry;
// starting -> 'payload' (INIT_INVALID): "Could not start the race." Back to hub (construction FD MR1, review NIT 1);
// starting, racing, paused -> 'contextLost' (CONTEXT_LOST) or 'internal' (any other code): "The race stopped unexpectedly.";
// submitting and later -> ignored
export function useMathRallyHost(args: { difficulty: 1 | 2 | 3 | 4; container: React.RefObject<HTMLDivElement> }):
  { phase: HostPhase; result: CompleteGameResult | null; retrySubmit(): void; failureKind: HostFailure | null };

// utils/lazyWithTimeout.ts (H8)
export function lazyWithTimeout<T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>, ms: number):
  React.LazyExoticComponent<T>;   // rejects after ms; the route error boundary shows "The race could not load."

// components/hub/GameTile.tsx (H7)
export const FREE_DIFFICULTIES_IN_PREMIUM_GAMES: Readonly<Record<string, readonly number[]>>; // { 'math-rally': [1] }
```

---

## 4. Bridge protocol (G14, A4)

Envelope: one JSON text per message, UTF-8, at most 16 384 bytes, top-level object with `v` (must be 1) and `type`. Unknown `type`, extra keys, wrong types or out-of-range values: the receiver ignores the message and (development builds only) logs the type name. Validation order: size, `JSON.parse`, envelope, type-specific fields. The envelope `v` is the message format; `protocolVersion` is the race protocol of Section 1.

| Direction | `type` | Fields (all required unless marked) |
|---|---|---|
| Game to host | `ready` | `protocolVersion`: integer 1..99 (the bundle's `MR_CLIENT_PROTOCOL`); `buildId`: string matching `^[A-Za-z0-9._-]{1,40}$` |
| Game to host | `raceFinished` | `choices`: integer array, length = forks of the race, each 0..paths-1; `forkTimesMs`: integer array, same length, strictly increasing, each 0..3 600 000; `raceTimeMs`: integer >= last fork time and <= 3 600 000; `correctCount`: integer 0..forks (display only, never sent to the server) |
| Game to host | `pauseChanged` | `paused`: boolean; `sound`: boolean |
| Game to host | `exitRequested` | none |
| Game to host | `error` | `code`: one of `ENGINE_START_FAILED`, `ASSET_LOAD_FAILED`, `CONTEXT_LOST`, `INIT_INVALID`, `INTERNAL` |
| Host to game | `init` | `mode`: `scored` or `offline`; `difficulty`: 1..4; `language`: `en`, `es` or `pt`; `sound`: boolean; `reducedMotion`: boolean; `touchUi`: boolean; `race`: race payload (required when `scored`, absent when `offline`); `seed`: integer 0..4 294 967 295 (required when `offline`, absent when `scored`) |
| Host to game | `pause` | none |
| Host to game | `resume` | none |
| Host to game | `setSound` | `sound`: boolean |

Race payload validation inside the game (before the countdown): `protocolVersion === MR_CLIENT_PROTOCOL` (the host sent that same version to `startGame`, so a server that accepted it built the race with the same spec); `difficulty` equals `init.difficulty`; `forks`, `paths`, `readSeconds` equal `protocolSpec(MR_CLIENT_PROTOCOL).params[difficulty]`; `questions.length === forks`; each `kind` is in that spec's kinds for the difficulty; operands integers within +-1000, at most 4 per question; options `isCanonicalOption`, pairwise distinct by value, `paths` long; `correctIndex` in range. Failure sends `error{INIT_INVALID}`.

```ts
// bridge/protocol.ts
export type GameToHost = Ready | RaceFinished | PauseChanged | ExitRequested | GameError;
export type HostToGame = Init | Pause | Resume | SetSound;
export function parseHostMessage(text: string): HostToGame | null;
export function parseGameMessage(text: string, race?: { forks: number; paths: number }): GameToHost | null;
export function validateRacePayload(value: unknown, difficulty: MathRallyDifficulty): MathRallyRacePayload | null;
export function encode(message: GameToHost | HostToGame): string;   // throws if over 16 KB (never expected)

// bridge/hostChannel.ts
export interface HostChannel { send(message: GameToHost): void; onMessage(handler: (m: HostToGame) => void): () => void }
export interface HostSide { send(message: HostToGame): void; onMessage(handler: (m: GameToHost) => void): () => void }
export function createDirectChannelPair(): { game: HostChannel; host: HostSide };   // web
export function createWebViewChannel(win: Window): HostChannel;                     // app bundle
```

```dart
// lib/game/math_rally/protocol.dart (A4)
const Set<int> kSupportedProtocolVersions = {1};   // must contain the bundle's MR_CLIENT_PROTOCOL (Dart test reads build-info.json)
const int kMaxMessageBytes = 16384;
const String kMathRallyUpdateRequiredMessage = 'Please update the app to play.'; // equal to the shared constant (H9 checks)
sealed class GameMessage {}
class ReadyMessage extends GameMessage { final int protocolVersion; final String buildId; }
class RaceFinishedMessage extends GameMessage {
  final List<int> choices; final List<int> forkTimesMs; final int raceTimeMs; final int correctCount; }
class PauseChangedMessage extends GameMessage { final bool paused; final bool sound; }
class ExitRequestedMessage extends GameMessage {}
class GameErrorMessage extends GameMessage { final String code; }
GameMessage? parseGameMessage(String text, {int? forks, int? paths});
String encodeInit({required String mode, required int difficulty, required String language,
  required bool sound, required bool reducedMotion, required bool touchUi, Map<String, dynamic>? race, int? seed});
String encodePause(); String encodeResume(); String encodeSetSound(bool sound);
Map<String, dynamic>? validateRacePayload(Object? raw, int difficulty); // shape check before init
```
`encodeInit` takes only these named values; there is no parameter through which a token, email or username could be passed (AC-47.1 test asserts the encoded text against a fixture user with known token and email strings). The shared fixture `bridge/__fixtures__/messages.json` holds valid and invalid examples of every message, including a `raceFinished` with `correctCount`, and both test suites parse all of them.

---

## 5. Backend (`services/game/src/`, `services/leaderboard/src/`, MR3)

```ts
// services/game.service.ts (B1, B2, B10)
async startGame(userId: string, input: StartGameInput): Promise<StartGameResponse>;
//   StartGameInput gains: mathRallyProtocol?: unknown   (read only for MATH_RALLY; any value passes the schema)
//   B1 for MATH_RALLY, right after the difficulty check and before any read (services Section 4.1 step 1):
//     const v = input.mathRallyProtocol;
//     if (!(Number.isInteger(v) && MR_SUPPORTED_PROTOCOLS.includes(v as number)))
//       throw new ValidationError(MATH_RALLY_UPDATE_REQUIRED_MESSAGE);
//     refused: missing, null, 0, 2 (not supported at launch), 1.5, "1", objects, arrays (AC-26.3)
//     warn log: { userId, protocol: Number.isInteger(v) ? v : typeof v } (never the raw value)
//   other themes never read the field, whatever its value (AC-26.2)
//   StartGameResponse gains: mathRally?: MathRallyRacePayload
private async completeMathRallyGame(userId: string, input: CompleteGameInput, username: string, game: Game):
  Promise<CompleteGameResponse>;

// utils/validation.ts (B6)
// startGameInputSchema gains    mathRallyProtocol: z.unknown().optional()      (the questContext pattern)
// completeGameInputSchema gains mathRallySubmission: z.unknown().optional()   (the circuitSubmission pattern)
// Both are plain z.object schemas, which drop undeclared keys, so both fields must be declared. The handler
// parses before the service runs and a ZodError becomes INTERNAL_ERROR, so neither field is typed here:
// B1 and B3 decide, and every refusal keeps its own message.

// utils/math-rally-validation.ts (B3)
export type MathRallyRejectStage = 'record' | 'validation' | 'timing';
export function parseMathRallyRecord(raw: unknown, difficulty: number): MathRallyGameRecord | null;
// seed uint32; protocolVersion in MR_SUPPORTED_PROTOCOLS; paths and forks equal protocolSpec(v).params[difficulty];
// key length forks, each 0..paths-1; difficulty is the stored game's difficulty (1..4)
export function validateMathRallySubmission(raw: unknown, completionTime: number, record: MathRallyGameRecord):
  { ok: true; value: { choices: number[]; forkTimesMs: number[]; completionTime: number } } | { ok: false };
export function checkTiming(value: { forkTimesMs: readonly number[]; completionTime: number },
  record: MathRallyGameRecord, difficulty: MathRallyDifficulty, correct: readonly boolean[]): boolean;
// expected = expectedRaceTimesMs(record.protocolVersion, difficulty, correct);
// isPlausibleTiming({ forkTimesMs, completionTimeMs: completionTime * 1000 }, expected,
//                   protocolSpec(record.protocolVersion).track.timingToleranceMs)

// services/score-calculator.service.ts (B4)
calculateMathRallyBreakdown(input: { correct: number; forks: number; completionTime: number;
  difficulty: MathRallyDifficulty; gameIsPaid: boolean }): ScoreBreakdown;
// baseScore = MR_BASE[difficulty], MR_BASE = { 1: 2000, 2: 2000, 3: 2000, 4: 2134 }
// difficultyMultiplier = { 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5 }[difficulty]
// speedBonus = 1.0 (client time never enters the score); accuracy = correct / forks; accuracyBonus = 0.5 + accuracy
// finalScore = min(cap, max(0, round(baseScore x difficultyMultiplier x accuracyBonus))), NaN or Infinity -> 0
// cap = (gameIsPaid || difficulty >= 4) ? 8000 : 6000; completionTime is returned for display only
```
Resulting scores (AC-32.1 to AC-32.5): all correct gives 3000, 4500, 6000 and 8000 (difficulty 4: 2134 x 2.5 x 1.5 = 8002.5, rounded 8003, capped 8000, the same pattern as the generic Super Hard base 1100 in the current calculator). Zero correct gives 1000, 1500, 2000 and 2668, the four values AC-32.3 names: exactly one third at difficulty 1 to 3, and one third of the uncapped 8003 at difficulty 4 (2134 x 2.5 x 0.5 = 2667.5, rounded). Each extra correct answer adds at least 2000 x 1.0 / 10 = 200 points, so AC-32.1 holds after rounding and capping. Two submissions with the same choices and different valid times score the same (AC-32.2).

```ts
// utils/metrics.ts (B8)
async publishMathRallyRejected(stage: MathRallyRejectStage): Promise<void>; // swallows its own errors

// handlers/game.handler.ts (B6): startGame mapping adds ...(result.mathRally ? { mathRally: result.mathRally } : {})
```

Submission schema (B3), applied after `parseMathRallyRecord` succeeds:
```ts
z.object({
  choices: z.array(z.number().int().min(0).max(record.paths - 1)).length(record.forks),
  forkTimesMs: z.array(z.number().int().min(0).max(3_600_000)).length(record.forks),
}).strict()
// plus: forkTimesMs strictly increasing; completionTime finite, 1 <= t <= 3600;
//       forkTimesMs[last] <= completionTime * 1000
```

```ts
// services/leaderboard (L1)
GameType.MATH_RALLY = 'MATH_RALLY'
// calculateScore: case GameType.MATH_RALLY joins the standard group (score comes from the event)
// validateScore: case GameType.MATH_RALLY -> this.config.mathRally
// loadConfiguration: mathRally.validationRules = { minCompletionTime: 1, maxCompletionTime: 3600, minScore: 0, maxScore: 8000 }
// anomaly.service.ts unchanged (Q40); AC-38.2 test: a flagged MATH_RALLY entry is still returned by the query
```

---

## 6. App host (`apps/mobile/lib/`, MR5)

```dart
// api/game_api.dart, api/game_models.dart (A6)
Future<StartGameResult> startGame({required String themeId, required int difficulty,
  QuestContext? questContext, int? mathRallyProtocol});
// non-null mathRallyProtocol: uses the second StartGame document (with the mathRally selection) and adds
// 'mathRallyProtocol' to the input; null: exactly today's request
class StartGameResult { /* existing fields */ final Map<String, dynamic>? mathRally; }
static const Set<String> completeExtraKeys = { /* existing */ 'mathRallySubmission' };
// GameApiException gains: bool get isUpdateRequired => message == kMathRallyUpdateRequiredMessage;

// game/framework/game_session.dart (A6, additive)
Future<void> start({int? mathRallyProtocol});   // passes the value to GameApi.startGame; existing callers unchanged
enum BlockReason { rateLimited, paidRequired, questFailed, updateRequired } // updateRequired added, checked before
                                                                          // the quest and paywall branches
class GameSessionState { /* existing */ final Map<String, dynamic>? startPayload; }
// The play screen uses the existing gameSessionProvider(args); no new provider.

// game/math_rally/bridge.dart (A3)
abstract class WebViewPort {
  Future<void> evaluate(String javascript);
  void addHandler(String name, void Function(List<dynamic> args) handler);
}
class MathRallyBridge {
  MathRallyBridge(WebViewPort port, {required int Function() forks, required int Function() paths});
  Stream<GameMessage> get messages;
  Future<void> send(String encodedHostMessage);   // evaluate('window.__mathRallyReceive(' + jsonEncode(text) + ')')
  void dispose();
}

// game/math_rally/asset_server.dart (A5)
const String kAndroidAssetOrigin = 'https://appassets.androidplatform.net';
const String kIosScheme = 'dashden-game';
String gameEntryUrl({required bool isIos});
({Uint8List bytes, String mimeType})? resolveIosAsset(Uri uri, AssetBundle bundle); // null = request refused
bool isAllowedNavigation(Uri uri, {required bool isIos});                           // own origin only
String mimeTypeFor(String path); // .html text/html, .css text/css, .js text/javascript, .json application/json, .png image/png,
                                 // .webp image/webp, .ogg audio/ogg, .m4a audio/mp4, .mp3 audio/mpeg,
                                 // .woff2 font/woff2; any other extension -> refused

// ui/screens/games/math_rally_screens.dart (A2): Back rule, pure so the AC-48.3 test needs no WebView
const Duration kPauseConfirmTimeout = Duration(seconds: 1);
enum PlayPhase { loading, racing, paused, submitting, overlay } // loading: before init; racing: from init (countdown
                                                                // included) to raceFinished; overlay: race stopped,
                                                                // load failure, update required, save failure
enum BackAction { sendPauseAndWait, openLeaveConfirm, leave, ignore }
BackAction backAction(PlayPhase phase, {required bool pausePending});
// loading -> leave; racing and !pausePending -> sendPauseAndWait; racing and pausePending -> openLeaveConfirm;
// paused -> openLeaveConfirm; submitting -> ignore (the submission is in flight); overlay -> leave
// The screen sets pausePending on sendPauseAndWait and starts a kPauseConfirmTimeout timer; pauseChanged{paused: true}
// clears both; when the timer fires with pausePending still set, the screen opens confirmLeaveGame (AC-48.3).

// game/math_rally/level_locks.dart (A9)
enum LevelLock { playable, lockedPaid }
LevelLock lockState(int difficulty, {required bool freeTier, required bool gameIsPaid, required List<int> freeDifficulties});

// config/paid_games.dart (A7)
const Map<String, List<int>> kFreeDifficultiesInPaidGames = {'MATH_RALLY': [1]};
bool hasFreeDifficulties(String themeId);

// game/hub_logic.dart (A7): blockedPaid also requires !hasFreeDifficulties(entry.themeId);
// HubTile gains `final bool showPaidBadge` (paid and FREE tier, even when playable)
```

---

## 7. Build tooling (T1)

```text
node apps/web/scripts/build-math-rally-embed.mjs [--out <dir>] [--gate] [--check-only]
  default --out: apps/mobile/assets/math_rally
  build: vite build --config vite.math-rally-embed.config.ts (iife, no sourcemap)
  --gate: same build with --mode gate (G17 overlay, violation recorder and Fault trigger included) and
          "gate": true in build-info.json; for MR1 and MR5 device checks only, never committed
         copy embed/index.html, embed/page.css and public/games/math-rally/** (including sys/) to --out
         write build-info.json { protocolVersion, buildId, sourceHash, files: [{ path, sha256 }] }
         exit 1 if the build fails or the total --out size is over 4 MB (NFR-MK-3 app budget)
         exit 1 if index.html has a <script> element without src, a <style> element or a style= attribute
                (case-insensitive scan of the markup; NFR-MK-17), or if sys/default.png, sys/missing.png
                or sys/white.png is missing from --out (G1)
  --check-only (no build; reads only):
         recompute sourceHash from the working tree and compare with build-info.json
         recompute sha256 of every file under --out and compare with build-info.json files (no file missing or extra)
         exit 3 if build-info.json has "gate": true (a gate build must never be released)
         exit 0 when both match, exit 3 on any difference (message names the first differing input or output file)
  any unknown argument: exit 2
```
```js
// apps/web/scripts/math-rally-source-hash.mjs (pure, imported by the build script and by a Vitest test)
export const SOURCE_HASH_INPUTS = [
  'apps/web/src/games/math-rally/**',          // game core, embed entry, game locales, funnel
  'packages/shared/src/math-rally/**',          // race core, all protocol versions, fixtures
  'apps/web/public/games/math-rally/**',        // assets and CREDITS.json
  'apps/web/vite.math-rally-embed.config.ts',
  'apps/web/scripts/build-math-rally-embed.mjs',
  'apps/web/scripts/math-rally-source-hash.mjs',
  'apps/web/package-lock.json',
];  // excluded: any path containing /__tests__/ or ending in .test.ts
export function computeSourceHash(files: { path: string; bytes: Uint8Array }[]): string;
// paths relative to the repo root with '/' separators, sorted by code unit; for text extensions
// (.ts .tsx .js .mjs .json .html .css .svg .txt) CRLF is normalised to LF before hashing, because
// .html and .mjs are checked out with native line endings on Windows (.gitattributes: text=auto);
// result = hex SHA-256 over the concatenation of path + '\0' + hex SHA-256(content) + '\n' per file
```
`buildId` in the app bundle is `app-` plus the first 12 hex characters of `sourceHash`; it is informational (shown in the `ready` message and debug logs) and is not sent to the server. Output files under `--out` are hashed with the same text normalisation, so a Windows checkout and the owner's Mac agree. AC-51.2 test (Vitest): changing the bytes of any one input changes the hash; reordering the input list does not; a CRLF-only change in a text file does not.
