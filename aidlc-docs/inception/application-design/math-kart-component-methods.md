# Math Rally - Component Methods

**Created**: 2026-11-25
**Stage**: INCEPTION - Application Design
**Note**: Signatures and contracts only. Numbers marked *FD* (Functional Design) are chosen per unit in Construction within the stated constraints; every constraint here is testable. Phaser method names follow the Phaser 3 API and are confirmed against Phaser 4 in MR1 (U1).

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
  operands: readonly number[];       // integers, |value| <= 1000; meaning fixed per kind
  options: readonly string[];        // `paths` entries, distinct, each matches ANSWER_PATTERN
  correctIndex: number;              // 0 .. paths-1
}
export interface MathRallyRacePayload {
  protocolVersion: 1;
  difficulty: MathRallyDifficulty;
  forks: number; paths: 2 | 3 | 4; readSeconds: number;
  questions: readonly MathRallyQuestion[]; // length === forks
}
export interface MathRallyGameRecord {
  seed: number; generatorVersion: number; paths: number; forks: number;
  key: readonly number[];            // correctIndex per fork
}
export interface MathRallySubmission { choices: readonly number[]; forkTimesMs: readonly number[] }
export const ANSWER_PATTERN: RegExp; // /^-?\d{1,3}$|^-?\d{1,2}\/\d{1,2}$/ with total length <= 4
```

### Constants and track (S1)
```ts
export const MATH_RALLY_THEME_ID = 'MATH_RALLY';
export const MR_GENERATOR_VERSION = 1;
export const MR_PROTOCOL_VERSION = 1;
export const RACE_PARAMS: Readonly<Record<MathRallyDifficulty,
  { paths: 2 | 3 | 4; forks: number; readSeconds: number }>>;
// { 1: {2,10,8}, 2: {3,12,7}, 3: {4,15,6}, 4: {4,15,5} } (requirements Section 4.0)

export const TRACK: Readonly<{
  segmentLength: number;            // world units per segment (FD)
  cruiseSpeed: number;              // units per second (FD)
  maxSpeed: number;                 // boost speed; the only speed used for timing floors
  slowFactor: 0.6; boostSeconds: number; slowSeconds: number;  // about 1 s and 1.5 s
  branchLength: number; gapLength: number; finishLength: number; // FD
  timingToleranceMs: number;        // frame-timing slack for FR-MK-30 (FD, at most 250)
}>;
export interface TrackLayout {
  questionStart: readonly number[]; decisionLine: readonly number[]; mergeEnd: readonly number[];
  finishLine: number;
}
export function trackLayout(difficulty: MathRallyDifficulty): TrackLayout;
export function minForkTimesMs(difficulty: MathRallyDifficulty): readonly number[];
// floor(decisionLine[k] / maxSpeed * 1000) - timingToleranceMs
export function minFinishTimeMs(difficulty: MathRallyDifficulty): number;
export function nominalRaceSeconds(difficulty: MathRallyDifficulty): number; // all correct at cruise, boosts included
```
Contracts (unit tests, FR-MK-8, FR-MK-12, FR-MK-11):
- `(decisionLine[k] - questionStart[k]) / maxSpeed >= readSeconds` for every k and difficulty.
- `mergeEnd[k] < questionStart[k + 1]`.
- `(branchLength + gapLength) / maxSpeed >= 1.5` (the correct answer stays visible at least 1.5 s after a wrong pick).
- `minForkTimesMs` is strictly increasing and positive.

### RNG, questions, distractors, race (S2 to S5)
```ts
export interface Rng { nextUint32(): number; nextInt(minIncl: number, maxIncl: number): number;
  pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[] }
export function createRng(seed: number): Rng;                 // mulberry32; seed coerced with >>> 0

export interface Exact { num: number; den: number }           // den > 0, reduced; den === 1 for integers
export interface GeneratedQuestion { kind: QuestionKind; operands: number[]; answer: Exact }
export function kindsFor(difficulty: MathRallyDifficulty): readonly QuestionKind[];
export function generateQuestion(rng: Rng, difficulty: MathRallyDifficulty): GeneratedQuestion;
export function formatExact(value: Exact): string;             // "56", "-7", "3/4"

export function buildOptions(rng: Rng, q: GeneratedQuestion, difficulty: MathRallyDifficulty,
  paths: number): string[];                                    // correct answer first; caller places it

export interface MathRallyRace { payload: MathRallyRacePayload; record: MathRallyGameRecord }
export function buildRace(seed: number, difficulty: MathRallyDifficulty): MathRallyRace;
```
Contracts (property tests with `fast-check`, 1000 seeds per difficulty):
- Deterministic: same seed and difficulty give deep-equal races; no `Math.random`, `Date` or I/O (lint rule plus test that stubs both and asserts they are not called).
- `questions.length === forks`; prompts (kind plus operands) pairwise distinct (FR-MK-17).
- Each fork: `options.length === paths`, distinct, all match `ANSWER_PATTERN`, exactly one equals `formatExact(answer)` and it sits at `correctIndex` (FR-MK-7, FR-MK-14).
- No negative option or answer below difficulty 4; no decimal anywhere (FR-MK-13).
- Position balance and runs: over 10 000 forks, each position share within 2 points of `1 / paths`; no run longer than 3 (FR-MK-16). Placement: draw a position uniformly; if it would make a fourth repeat, redraw from the other positions.
- `record.key[k] === payload.questions[k].correctIndex`.
- `buildRace` never throws for an integer seed and a valid difficulty; if a rule cannot produce enough distinct options it falls back to near values within range (tested by exhaustive small-range cases).

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
  buildId: string;                // ^[A-Za-z0-9._-]{1,40}$
  devOverlay?: boolean;           // ignored unless compiled with the dev or gate flag (G17)
}
export interface EngineHandle { destroy(): void }       // idempotent; never throws
export function mountMathRally(parent: HTMLElement, channel: HostChannel, options: EngineOptions): EngineHandle;
export function hasWebGL(): boolean;                     // probe used by hosts before mounting
```
`mountMathRally` throws `EngineStartError` (no message details) when Phaser cannot create a renderer; the host catches it (Section 5 of the services file).

### Pure core modules (G5, G7, G10, G11, `core/joystick.ts`, `core/projection.ts`)
```ts
// Lanes (G7)
export interface LaneState { count: number; lane: number }
export function moveLane(s: LaneState, action: 'left' | 'right'): LaneState; // clamped
export function resizeLanes(s: LaneState, newCount: number): LaneState;    // nearest valid lane

// Joystick model (G8)
export interface JoystickConfig { thresholdRatio: number; repeatDelayMs: number; repeatIntervalMs: number } // FD, e.g. 0.35, 400, 250
export interface JoystickState { active: boolean; side: -1 | 0 | 1; nextRepeatAt: number | null }
export function joystickStep(s: JoystickState, input: { dxRatio: number | null; nowMs: number }, c: JoystickConfig):
  { state: JoystickState; actions: ('left' | 'right')[] };                // null dx = released

// Race clock (G10)
export interface RaceClock { start(nowMs: number): void; pause(nowMs: number): void; resume(nowMs: number): void;
  elapsedMs(nowMs: number): number; isRunning(): boolean }
export function createRaceClock(): RaceClock;                              // integer ms, paused time excluded

// Track runtime (G5)
export type TrackEvent = { type: 'questionStart' | 'decisionLine' | 'merge'; fork: number } | { type: 'finish' };
export interface Kinematics { position: number; speed: number; boostUntil: number; slowUntil: number }
export function stepKinematics(k: Kinematics, dtMs: number, raceMs: number, layout: TrackLayout):
  { next: Kinematics; events: TrackEvent[] };   // dtMs clamped to [0, 50]; speed never above TRACK.maxSpeed
export function applyFeedback(k: Kinematics, correct: boolean, raceMs: number): Kinematics;

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

### Fork controller (G6)
```ts
export interface ForkOutcome { fork: number; choice: number; correct: boolean; atMs: number }
export interface ForkController {
  current(): { fork: number; question: MathRallyQuestion } | null;
  onDecisionLine(lane: number, raceMs: number): ForkOutcome;    // records choice and time once per fork
  coins(): number;                                              // === number of correct outcomes
  submission(): { choices: number[]; forkTimesMs: number[] };   // only after the last fork
}
export function createForkController(race: MathRallyRacePayload): ForkController;
```

### Phaser scenes (G2, G3, G9) - lifecycle hooks only
```ts
class BootScene extends Phaser.Scene { preload(): void; create(): void }   // load all, then channel.send(ready)
class RaceScene extends Phaser.Scene { init(data: RaceInit): void; create(): void; update(time: number, delta: number): void }
class HudScene  extends Phaser.Scene { create(): void; showQuestion(q: MathRallyQuestion): void;
  showFeedback(o: ForkOutcome, reveal: string): void; setPaused(paused: boolean): void }
interface RaceInit { race: MathRallyRacePayload; language: 'en' | 'es' | 'pt'; sound: boolean; reducedMotion: boolean;
  scored: boolean }
```

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
export const startMathRallyGame: (input: { themeId: 'MATH_RALLY'; difficulty: 1 | 2 | 3 | 4 }) => Promise<MathRallyStartResult>;
// shares the internal runStart(document, input) with startGame, so the quest param and rule R1 apply
export interface MathRallySubmissionInput { choices: number[]; forkTimesMs: number[] }
// CompleteGameInput gains: mathRallySubmission?: MathRallySubmissionInput

// pages/math-rally/levelLocks.ts (H3)
export type LevelLock = 'playable' | 'lockedPaid';
export function lockState(difficulty: 1 | 2 | 3 | 4,
  ctx: { tier: string; gameIsPaid: boolean; freeDifficulties: readonly number[] }): LevelLock;
// lockedPaid when tier === 'FREE' and (difficulty === 4 or (gameIsPaid and difficulty not in freeDifficulties))

// pages/math-rally/useMathRallyHost.ts (H2)
export type HostPhase = 'loadingEngine' | 'starting' | 'racing' | 'paused' | 'submitting'
  | 'result' | 'saveFailed' | 'rejected' | 'failed';
export function useMathRallyHost(args: { difficulty: 1 | 2 | 3 | 4; container: React.RefObject<HTMLDivElement> }):
  { phase: HostPhase; result: CompleteGameResult | null; retrySubmit(): void; failureKind: HostFailure | null };
export type HostFailure = 'noWebGL' | 'engine' | 'assets' | 'start' | 'payload' | 'contextLost';
export function parseGameSearch(search: string): { difficulty: 1 | 2 | 3 | 4 } | null;
// accepts difficulty=easy|medium|hard|superhard only; anything else -> null (redirect to setup)

// components/hub/GameTile.tsx (H7)
export const FREE_DIFFICULTIES_IN_PREMIUM_GAMES: Readonly<Record<string, readonly number[]>>; // { 'math-rally': [1] }
```

---

## 4. Bridge protocol (G14, A4)

Envelope: one JSON text per message, UTF-8, at most 16 384 bytes, top-level object with `v` (must be 1) and `type`. Unknown `type`, extra keys, wrong types or out-of-range values: the receiver ignores the message and (development builds only) logs the type name. Validation order: size, `JSON.parse`, envelope, type-specific fields.

| Direction | `type` | Fields (all required unless marked) |
|---|---|---|
| Game to host | `ready` | `protocolVersion`: integer 1..99; `buildId`: string matching `^[A-Za-z0-9._-]{1,40}$` |
| Game to host | `raceFinished` | `choices`: integer array, length = forks of the race, each 0..paths-1; `forkTimesMs`: integer array, same length, strictly increasing, each 0..3 600 000; `raceTimeMs`: integer >= last fork time and <= 3 600 000; `correctCount`: integer 0..forks (display only, never sent to the server) |
| Game to host | `pauseChanged` | `paused`: boolean; `sound`: boolean |
| Game to host | `exitRequested` | none |
| Game to host | `error` | `code`: one of `ENGINE_START_FAILED`, `ASSET_LOAD_FAILED`, `CONTEXT_LOST`, `INIT_INVALID`, `INTERNAL` |
| Host to game | `init` | `mode`: `scored` or `offline`; `difficulty`: 1..4; `language`: `en`, `es` or `pt`; `sound`: boolean; `reducedMotion`: boolean; `race`: race payload (required when `scored`, absent when `offline`); `seed`: integer 0..4 294 967 295 (required when `offline`, absent when `scored`) |
| Host to game | `pause` | none |
| Host to game | `resume` | none |
| Host to game | `setSound` | `sound`: boolean |

Race payload validation inside the game (before the countdown): `protocolVersion` 1; `difficulty` equals `init.difficulty`; `forks`, `paths`, `readSeconds` equal `RACE_PARAMS[difficulty]`; `questions.length === forks`; each `kind` known for that difficulty; operands integers within +-1000, at most 4 per question; options match `ANSWER_PATTERN`, distinct, `paths` long; `correctIndex` in range. Failure sends `error{INIT_INVALID}`.

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
const Set<int> kSupportedProtocolVersions = {1};
const int kMaxMessageBytes = 16384;
sealed class GameMessage {}
class ReadyMessage extends GameMessage { final int protocolVersion; final String buildId; }
class RaceFinishedMessage extends GameMessage { final List<int> choices; final List<int> forkTimesMs; final int raceTimeMs; }
class PauseChangedMessage extends GameMessage { final bool paused; final bool sound; }
class ExitRequestedMessage extends GameMessage {}
class GameErrorMessage extends GameMessage { final String code; }
GameMessage? parseGameMessage(String text, {int? forks, int? paths});
String encodeInit({required String mode, required int difficulty, required String language,
  required bool sound, required bool reducedMotion, Map<String, dynamic>? race, int? seed});
String encodePause(); String encodeResume(); String encodeSetSound(bool sound);
Map<String, dynamic>? validateRacePayload(Object? raw, int difficulty); // shape check before init
```
`encodeInit` takes only these named values; there is no parameter through which a token, email or username could be passed (AC-47.1 test asserts the encoded text against a fixture user with known token and email strings).

---

## 5. Backend (`services/game/src/`, `services/leaderboard/src/`, MR3)

```ts
// services/game.service.ts (B1, B2, B10)
async startGame(userId: string, input: StartGameInput): Promise<StartGameResponse>;
//   StartGameResponse gains: mathRally?: MathRallyRacePayload
private async completeMathRallyGame(userId: string, input: CompleteGameInput, username: string, game: Game):
  Promise<CompleteGameResponse>;

// utils/math-rally-validation.ts (B3)
export type MathRallyRejectStage = 'record' | 'validation' | 'timing';
export function validateMathRallySubmission(raw: unknown, completionTime: number, record: MathRallyGameRecord):
  { ok: true; value: { choices: number[]; forkTimesMs: number[]; completionTime: number } } | { ok: false };
export function parseMathRallyRecord(raw: unknown): MathRallyGameRecord | null;   // stored attribute sanity check
export function checkTiming(forkTimesMs: readonly number[], completionTime: number, difficulty: MathRallyDifficulty): boolean;

// services/score-calculator.service.ts (B4)
calculateMathRallyBreakdown(input: { correct: number; forks: number; completionTime: number;
  difficulty: MathRallyDifficulty; gameIsPaid: boolean }): ScoreBreakdown;
// accuracy = correct / forks; accuracyBonus = 0.5 + accuracy
// speedBonus = clamp(1 + MR_TIME_WEIGHT * (T - t) / T, 0.9, 1.1), T = nominalRaceSeconds(difficulty)
// final = round(MR_BASE[difficulty] * multiplier * speedBonus * accuracyBonus), capped at
//         (gameIsPaid || difficulty >= 4) ? 8000 : 6000; NaN or Infinity -> 0
// MR_BASE and MR_TIME_WEIGHT are FD numbers chosen so a perfect race at the fastest plausible time
// lands within 5% of 3000 / 4500 / 6000 / 8000 (AC-32.4)

// utils/metrics.ts (B8)
async publishMathRallyRejected(stage: MathRallyRejectStage): Promise<void>; // swallows its own errors

// handlers/game.handler.ts (B6): startGame mapping adds ...(result.mathRally ? { mathRally: result.mathRally } : {})
// utils/validation.ts: completeGameInputSchema gains mathRallySubmission: z.unknown().optional()
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
```

---

## 6. App host (`apps/mobile/lib/`, MR5)

```dart
// api/game_api.dart, api/game_models.dart (A6)
Future<StartGameResult> startGame({required String themeId, required int difficulty,
  QuestContext? questContext, bool withMathRallyRace = false});   // picks the second document
class StartGameResult { /* existing fields */ final Map<String, dynamic>? mathRally; }
static const Set<String> completeExtraKeys = { /* existing */ 'mathRallySubmission' };

// game/framework/game_session.dart (A6, additive)
GameSessionController(GameApi api, GameSessionArgs args,
  {void Function(QuestResult?)? onQuestResult, bool requestMathRallyRace = false});
class GameSessionState { /* existing */ final Map<String, dynamic>? startPayload; }

// game/math_rally/math_rally_session.dart
final mathRallySessionProvider = StateNotifierProvider.family
    .autoDispose<GameSessionController, GameSessionState, GameSessionArgs>(...); // requestMathRallyRace: true

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
({Uint8List bytes, String mimeType})? resolveIosAsset(Uri uri, AssetBundle bundle); // null = 404
bool isAllowedNavigation(Uri uri, {required bool isIos});                           // own origin only

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
node apps/web/scripts/build-math-rally-embed.mjs [--out <dir>] [--check-only]
  default --out: apps/mobile/assets/math_rally
  steps: vite build --config vite.math-rally-embed.config.ts (iife, no sourcemap)
         copy embed/index.html and public/games/math-rally/** to --out
         write build-info.json { protocolVersion, buildId, builtAt }
         fail (exit 1) if total --out size > 4 MB (NFR-MK-3 app budget)
  --check-only: build into a temp folder and compare protocolVersion and file list with --out (exit 3 on drift)
```
