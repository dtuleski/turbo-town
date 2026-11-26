# Daily Challenge and Push: Unit Dependencies

| Unit | Depends on | What it needs | Branch cut from |
|---|---|---|---|
| DC2 Challenge core | none | | `feat/daily-challenge` |
| DC3 Repeatable content | DC2 | rotation, content types, `getDailyChallenge`, `challengeContext` on `startGame` | DC2 branch |
| DC1 Notifications backend | DC2 | `ChallengeService.ensureChallenge`, `getDayResults`, `SCORE#` lookups for the push skip | DC3 branch (linear chain) |
| DC4 Web | DC1, DC2, DC3 | `saveNotificationSettings`, leaderboard operations, given-content pages | DC1 branch |
| DC5 App | DC1, DC2, DC3 | device operations, leaderboard operations, given-content screens | DC4 branch |

Merge order into `main`: DC2, DC3, DC1, DC4, DC5. Each later pull request contains the earlier units'
commits; once an earlier one merges, the later one's diff shrinks to its own unit.

Deploy effect of each merge (CI on `main` deploys the Game, Leaderboard and Email Sender Lambdas when
`services/game/src`, `services/leaderboard/src`, `services/email-sender` or `packages/shared` change, and
Vercel deploys the web):

| Merge | Game Lambda | Web | Digest Lambda | Safe because |
|---|---|---|---|---|
| DC2 | redeployed | unchanged | not deployed by CI | no `DAILY_CHALLENGE_TABLE_NAME`: challenge off, starts fail closed |
| DC3 | redeployed | redeployed | not deployed | nothing links to `?challenge=` yet; pages without it unchanged |
| DC1 | redeployed | unchanged | not deployed (owner runs the script) | device APIs answer `ok: false` without `PUSH_DEVICES_TABLE_NAME`; `saveNotificationSettings` writes the existing prefs table |
| DC4 | unchanged | redeployed | not deployed | card hidden while `getDailyChallenge` is null |
| DC5 | none | none | none | app ships through TestFlight by the owner |
