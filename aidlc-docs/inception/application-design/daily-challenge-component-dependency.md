# Daily Challenge and Push: Component Dependencies

Component ids from `daily-challenge-components.md`.

## Dependency matrix (row depends on column)

| | C1-C7 shared | G1 ChallengeRepo | G2 ChallengeSvc | G5 DeviceRepo | G7 EmailPrefs | SNS | Secrets Manager | Resend |
|---|---|---|---|---|---|---|---|---|
| G2 ChallengeService | yes | yes | | | | | | |
| G3 GameService | yes (day helpers) | | yes (optional) | | | | | |
| G4 Handler | | | yes | via G6 | yes | | | |
| G6 PushDeviceService | | | | yes | yes (locale) | DeleteEndpoint | | |
| G8 AccountDeletion | | table by env | | table by env | existing | DeleteEndpoint | | |
| N1 Tick handler | yes | | yes | yes | yes (scan, claims) | via N6 | via N5 | yes (existing) |
| N6 PushSender | | | | yes (cleanup) | | CreatePlatformEndpoint, SetEndpointAttributes, GetEndpointAttributes, Publish, DeleteEndpoint | | |
| W1-W8 Web | C1-C3 types and day helpers via `challengeShared.ts` | | over GraphQL | | over GraphQL | | | |
| M1-M8 App | Dart models mirror C1 | | over GraphQL | | over GraphQL | | | |

## Communication

| From | To | How |
|---|---|---|
| Web, App | Game Lambda | Existing GraphQL-over-HTTP endpoint (API Gateway JWT authorizer); new operations routed by name |
| Game Lambda | DynamoDB | Document client; new tables by env var |
| EventBridge rule | Digest Lambda | Scheduled event every 15 minutes (asynchronous invoke, retries) |
| Digest Lambda | SNS | Mobile push endpoints and Publish with `MessageStructure: json` (`APNS`, `APNS_SANDBOX`) |
| SNS | APNs | Token-based auth from the platform application |
| Digest Lambda | Resend | Existing HTTPS call |
| App native | App Dart | Method channel `app.dashden/push` |
| Game Lambda, Digest Lambda | Leaderboard service | None new: challenge games publish the existing `GameCompleted` event |

## Data flow

1. Tick or first request of the day: rotation and seed (shared) to a stored `CHALLENGE` item.
2. Client: `getDailyChallenge` to content; play; `startGame` with `challengeContext`; `completeGame`.
3. Server: score (existing calculator) to the game record and `GameCompleted` event (normal leaderboards),
   then best score to the `SCORE#` item (challenge leaderboard).
4. Tick at 8am local: prefs, yesterday's `SCORE#` items, existing digest data to email and push.
5. Tick at 12pm local: today's `CHALLENGE` item and the user's `SCORE#` (absent) to the challenge push.

## Build-time dependencies

- `services/game` resolves `@memory-game/shared` from `packages/shared` (`file:` dependency; jest maps to
  `src`, `tsc` needs `packages/shared` built first with `npm run build`).
- `apps/web` imports `packages/shared/src/challenge/*` only through `src/utils/challengeShared.ts`.
- `apps/mobile` has no build dependency on TypeScript; it parses the JSON content. A Dart fixture test
  checks Code-a-Bot level parity with the web.
