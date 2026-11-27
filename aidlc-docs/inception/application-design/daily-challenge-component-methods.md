# Daily Challenge and Push: Component Methods

Signatures and contracts. Detailed rules (exact validation per game, texts) are settled in each unit's
Functional Design.

## 1. Shared core (`packages/shared/src/challenge/`)

```ts
type ChallengeDay = string;                       // 'YYYY-MM-DD', US Eastern
type ChallengeLanguage = 'en' | 'es' | 'pt';
const CHALLENGE_TIME_ZONE = 'America/New_York';

// day.ts
function challengeDayOf(at: Date): ChallengeDay;
function challengeDayBounds(day: ChallengeDay): { start: Date; end: Date };   // end exclusive
function addDays(day: ChallengeDay, n: number): ChallengeDay;
function isChallengeDay(value: unknown): value is ChallengeDay;              // format and real date
function localParts(at: Date, timeZone: string): { date: string; hour: number; minute: number };
function isValidTimeZone(value: unknown): value is string;                  // IANA, length <= 64

// rng.ts
function seedFrom(text: string): number;          // 32-bit hash of a string
function mulberry32(seed: number): () => number;  // [0, 1)
function randInt(rng: () => number, min: number, max: number): number;
function shuffle<T>(rng: () => number, items: readonly T[]): T[];

// rotation.ts
interface RotationEntry {
  gameId: string;            // catalog id, e.g. 'sudoku'
  themeId: string;           // server theme id, e.g. 'SUDOKU'
  difficulty: 1 | 2 | 3;     // 2 for all (plan Q7)
  settings: Record<string, number | string>;   // e.g. { questions: 15 }
  languageDependent: boolean;
}
const CHALLENGE_ROTATION: readonly RotationEntry[];   // 16 entries, FR-DC-14
function eligibleRotation(): RotationEntry[];         // entries with a registered generator

// draw.ts
function drawChallenge(day: ChallengeDay, eligible: readonly RotationEntry[], previousGameId?: string): RotationEntry;

// generators/index.ts
function generateContent(entry: RotationEntry, day: ChallengeDay): ChallengeContent;  // seed `${day}:${gameId}`
function expectedTotals(content: ChallengeContent, language?: ChallengeLanguage):
  { totalQuestions?: number; totalWords?: number };
function hasGenerator(gameId: string): boolean;

// content types (types.ts)
type ChallengeContent =
  | { kind: 'code-a-bot'; difficulty: 'medium'; levelNumbers: number[] }
  | { kind: 'sudoku'; puzzle: (number | null)[][]; solution: number[][] }
  | { kind: 'math-challenge'; questions: { question: string; answer: number; operation: string }[] }
  | { kind: 'math-maze'; maze: MazeContent }      // grid, start, exit, gates with equations, collectibles
  | { kind: 'word-puzzle'; byLanguage: Record<ChallengeLanguage, { grid: string[][]; words: string[]; gridSize: number }> }
  | { kind: 'hangman'; byLanguage: Record<ChallengeLanguage, { word: string; hint: string; category: string }[]> };
```

## 2. Game Lambda

### GraphQL operations (routed by name in `GameHandler.routeOperation`; `schema.graphql` documents them)

```graphql
input StartGameInput { themeId: ID! difficulty: Int! questContext: QuestContextInput challengeContext: ChallengeContextInput }
input ChallengeContextInput { day: String! }                      # today's challenge day only

type CompleteGameResponse { ... challenge: ChallengeCompletion }  # null when not a challenge game or not recorded
type ChallengeCompletion { day: String! recorded: Boolean! bestScore: Int rank: Int isNewBest: Boolean! }

type Query {
  getDailyChallenge: DailyChallenge                                # null when the feature is off
  getChallengeLeaderboard(day: String, limit: Int): ChallengeLeaderboard   # day defaults to today; limit 1..50, default 10
}
type DailyChallenge {
  day: String! gameId: String! themeId: String! difficulty: Int!
  settings: String! content: String!                               # JSON text; clients JSON-parse it
  endsAt: String!                                                  # ISO, next Eastern midnight
  me: ChallengeMyEntry                                             # null when not played today
}
type ChallengeMyEntry { bestScore: Int! rank: Int! achievedAt: String! }
type ChallengeLeaderboard { day: String! gameId: String! themeId: String! final: Boolean! entries: [ChallengeEntry!]! me: ChallengeMyEntry }
type ChallengeEntry { rank: Int! username: String! score: Int! achievedAt: String! isMe: Boolean! }

type Mutation {
  registerPushDevice(input: RegisterPushDeviceInput!): PushDeviceResult!     # DC1
  unregisterPushDevice(token: String!): PushDeviceResult!                     # DC1
  saveNotificationSettings(input: NotificationSettingsInput!): NotificationSettings!   # DC1
}
input RegisterPushDeviceInput { token: String! platform: PushPlatform! environment: ApnsEnvironment! timeZone: String language: String }
enum PushPlatform { IOS }                 # data model also allows ANDROID later
enum ApnsEnvironment { production sandbox }
type PushDeviceResult { ok: Boolean! }
input NotificationSettingsInput { timeZone: String language: String }
type NotificationSettings { timeZone: String language: String }
```

### Repositories and services

```ts
class ChallengeRepository {                    // table DAILY_CHALLENGE_TABLE_NAME
  getChallenge(day): Promise<StoredChallenge | null>;
  createChallenge(item: StoredChallenge): Promise<'created' | 'exists'>;     // attribute_not_exists(pk)
  getScore(day, userId): Promise<StoredScore | null>;
  putBestScore(day, userId, username, score, at): Promise<{ updated: boolean; best: StoredScore }>;
      // condition: attribute_not_exists(bestScore) OR bestScore < :score  (ties keep the earlier time)
  topScores(day, limit): Promise<StoredScore[]>;                             // rank-index ascending
  countAhead(day, rankKey): Promise<number>;                                 // rank-index, Select COUNT, rankKey < :k
}
// Items: CHALLENGE { pk: day, sk: 'CHALLENGE', gameId, themeId, difficulty, settings, content, createdAt }
//        SCORE     { pk: day, sk: 'SCORE#<userId>', userId, username, bestScore, achievedAt,
//                    rankPk: day, rankKey: `${pad12(999999999999 - bestScore)}#${achievedAt}` }

class ChallengeService {
  constructor(repo: ChallengeRepository, now?: () => Date);
  ensureChallenge(day): Promise<StoredChallenge>;          // previous day's item gives previousGameId
  getToday(userId): Promise<DailyChallengeView>;
  validateStart(input: unknown, themeId: string, difficulty: number): Promise<{ day: ChallengeDay }>;   // throws CHALLENGE_UNAVAILABLE_MESSAGE
  applyCompletion(userId, username, game: Game, score: number, metrics: CompleteGameInput): Promise<ChallengeCompletion>;
  getLeaderboard(userId, day?: unknown, limit?: unknown): Promise<ChallengeLeaderboardView>;
  getDayResults(day, userId?): Promise<{ challenge: StoredChallenge | null; top: StoredScore[]; me: ChallengeMyEntry | null }>;
}
function createChallengeService(env): ChallengeService | undefined;   // undefined when DAILY_CHALLENGE_TABLE_NAME is unset

class PushDeviceRepository {                    // table PUSH_DEVICES_TABLE_NAME
  upsert(device: PushDevice): Promise<void>;
  deleteOwned(deviceId, userId): Promise<boolean>;        // condition userId = :u
  listForUser(userId): Promise<PushDevice[]>;             // user-index
  delete(deviceId): Promise<void>;
  setEndpoint(deviceId, endpointArn): Promise<void>;
}
// PushDevice { deviceId, userId, platform: 'IOS' | 'ANDROID', token, environment, endpointArn?, timeZone?, language?, createdAt, updatedAt }

class PushDeviceService {
  register(userId, input: unknown): Promise<{ ok: true }>;
  unregister(userId, token: unknown): Promise<{ ok: boolean }>;   // also sns DeleteEndpoint, best effort
}

class EmailPrefsService {                        // existing; changes
  setPrefs(userId, email, username, dailyDigest): Promise<EmailPrefs>;     // UpdateItem, keeps other attributes
  setLocale(userId, timeZone?: string, language?: string): Promise<NotificationSettings>;
  claimSend(userId, kind: 'DigestEmail' | 'DigestPush' | 'ChallengePush', localDate: string): Promise<boolean>;
  releaseSend(userId, kind, localDate): Promise<void>;
}
```

### GameService changes (signatures unchanged)

- `startGame(userId, input)`: when `input.challengeContext` is present and no `challengeService` is
  injected, throw the generic challenge message; else `validateStart` before the paid-game and rate-limit
  gates; a validated start skips only the paid-game gate; stores `challengeDay` on the game.
- `completeGame(userId, input, username)`: after `finalizeQuest`, `finalizeChallenge` returns
  `challenge` in the response; any error is logged and yields `null`.
- `Game` entity (`packages/shared/src/types/entities.ts`) gains `challengeDay?: string`;
  `GameRepository.create` and `getById` store and read it.

## 3. Digest Lambda

```ts
export async function handler(event?: unknown): Promise<{ statusCode: number; body: string }>;
export async function runTick(deps: TickDeps, now: Date): Promise<TickSummary>;
// TickDeps: prefs scan, claims, challenge service, device repo, push sender, email sender, texts
function dueSends(user: { timeZone?: string; claims: Claims }, now: Date): { digestEmail: boolean; digestPush: boolean; challengePush: boolean; localDate: string };
function challengeSectionHtml(results, user, language): string;
function pushText(kind: 'digest' | 'challenge', language: ChallengeLanguage, data): { title: string; body: string };
async function loadApnsConfig(): Promise<{ platformApplicationArn: string; platformApplicationArnSandbox?: string } | null>;
class PushSender { send(device: PushDevice, message: { title; body; route }): Promise<'sent' | 'removed' | 'skipped' | 'failed'> }
```

## 4. Web

```ts
// api/challenge.ts
getDailyChallenge(): Promise<DailyChallengeView | null>;
getChallengeLeaderboard(day?: string, limit?: number): Promise<ChallengeLeaderboardView | null>;
saveNotificationSettings(input: { timeZone?: string; language?: string }): Promise<void>;
// utils/challengeLaunch.ts
parseChallengeParam(search: string): { day: string } | null;
buildChallengeUrl(challenge: { gameId: string; themeId: string; day: string }): string | null;
// hooks/useChallengeContent.ts
useChallengeContent<K extends ChallengeContent['kind']>(kind: K): { status: 'off' | 'loading' | 'ready'; content?: Extract<ChallengeContent, { kind: K }>; day?: string };
```

## 5. App

```dart
class ChallengeApi { Future<DailyChallenge?> getDailyChallenge(); Future<ChallengeLeaderboard?> getChallengeLeaderboard({String? day, int limit = 10}); }
class PushChannel { Future<bool> requestPermission(); Future<String?> deviceToken(); Stream<Map<String, dynamic>> taps; Future<String?> timeZone(); }
class PushController { Future<void> maybeSoftAsk(BuildContext context); Future<void> registerIfAllowed(); Future<void> unregister(); void handleTap(Map<String, dynamic> payload); }
```
