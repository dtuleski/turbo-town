# Daily Challenge and Push: Application Design Plan

Inputs: `../requirements/daily-challenge-requirements.md`, `daily-challenge-workflow-planning.md`,
reverse-engineering artifacts, and the code on `feat/daily-challenge` (main 47400b9 merged in, so
`services/game/src/post-confirmation.ts` is present). Answers are self-approved under the owner's
delegation ("I want to defer to all your recommendations. Just go!!", 2026-11-26) and flagged for
owner review. Depth: standard.

## Plan

- [x] Read requirements, workflow planning, and the code each component touches
- [x] Answer the design questions below (self-approved, owner may override)
- [x] Generate `application-design/daily-challenge-components.md` (components, responsibilities, Security Baseline table)
- [x] Generate `application-design/daily-challenge-component-methods.md` (method signatures and API contracts)
- [x] Generate `application-design/daily-challenge-services.md` (orchestration flows)
- [x] Generate `application-design/daily-challenge-component-dependency.md` (dependency matrix, data flow)
- [x] Validate completeness: every FR-DC and NFR-DC maps to a component (see the story map in Units Generation)

## Questions and answers

### Q1. Where does the local-time scheduler run?
A) Reuse the existing digest Lambda `DashDen-DailyEmail-prod` (handler `dist/daily-email.handler`, code
`services/game/src/daily-email.ts`); change its EventBridge rule `DashDen-DailyDigest-Schedule` from
`cron(0 12 * * ? *)` to every 15 minutes; each run sends whatever is due in each user's local time
(recommended)
B) A new Lambda and a new rule
C) One EventBridge Scheduler schedule per user

[Answer]: A. No new function, handler name unchanged, no new deploy pipeline beyond a build script that
follows `scripts/deploy-activation-email-lambda.sh`. B adds a function for no gain; C does not scale to
10,000 users cheaply and needs per-user schedule writes.

### Q2. How is "once per user per local day" guaranteed (FR-DC-10)?
A) Claim attributes on the user's `memory-game-email-prefs-<stage>` item: `lastDigestEmailOn`,
`lastDigestPushOn`, `lastChallengePushOn` (local date). A send first claims with a conditional update
(`attribute_not_exists(x) OR x <> :today`); a failed send releases the claim so a later run in the
window retries (recommended)
B) A separate notification-log table

[Answer]: A. The scheduler already scans this item; no new table, IAM or deletion path. `setPrefs`
changes from PutItem to UpdateItem so it no longer wipes the new attributes.

### Q3. How does push reach iOS, and where is the APNs key?
A) Amazon SNS mobile push with an APNs token-auth platform application. The owner stores the `.p8` key,
Key ID, Team ID and bundle id in the Secrets Manager secret `dashden/apns/prod`, creates the SNS platform
application from it, and adds its ARN to the same secret. The sender reads the secret at runtime (cached
10 minutes); a missing secret or a missing `platformApplicationArn` means push is off and email
continues (recommended)
B) Direct HTTP/2 calls to APNs signed in our code

[Answer]: A (owner decision: APNs through SNS). Trade-off recorded: the sender's role can read the whole
secret, including the key it does not use; one secret is simpler for the owner to create and rotate.
Endpoint ARNs are created lazily by the sender, so device registration works before the key exists.

### Q4. Data stores for the challenge and the devices?
A) Two new tables, both PAY_PER_REQUEST, AWS-managed encryption, PITR, RETAIN, defined in
`infrastructure/lib/stacks/database-stack.ts` like `memory-game-quest-progress-<stage>` (recommended):
- `memory-game-daily-challenge-<stage>`: `pk` (challenge day `YYYY-MM-DD`), `sk` (`CHALLENGE` or
  `SCORE#<userId>`); GSI `rank-index` (`rankPk`, `rankKey`) for the ordered leaderboard and rank counts;
  GSI `user-index` (`userId`, `pk`) for account deletion
- `memory-game-push-devices-<stage>`: `deviceId` (SHA-256 of platform and token); GSI `user-index`
  (`userId`)
B) Store scores in the existing leaderboard tables

[Answer]: A. The existing leaderboard tables belong to the leaderboard service and rank by other keys.
Keying devices by the token hash gives one owner per device (a token that signs in as another user moves
to that user) and keeps raw tokens out of keys and logs.

### Q5. How do web and app get the same puzzle (FR-DC-11, FR-DC-15)?
A) A seeded generator per game in `packages/shared/src/challenge/generators/`. The backend generates
the content once when it draws the day, stores it on the challenge item, and serves it through
`getDailyChallenge`. The web and the app play the given content; they never generate challenge content
(recommended, the direction approved in workflow planning)

[Answer]: A. Code-a-Bot content is the list of fixed level numbers; a parity test checks that the app's
levels equal the web's.

### Q6. Word Puzzle and Hangman are language-dependent. Which words does a challenge use?
A) One variant per language (en, es, pt) generated from the same seed with the same settings; each
player gets their language's variant; one shared leaderboard (recommended)
B) English for everyone

[Answer]: A. Follows FR-DC-6 (challenge texts in the user's language). Variants have the same length and
difficulty; small differences between languages are accepted.

### Q7. Open point: fixed challenge settings per game (FR-DC-13)
[Answer]: Medium (difficulty 2) for every game, so free users can play all of them and the time limits
already validated by `validateCompletionTime` apply. Per game in the first batch:

| Game id | Theme id | Difficulty | Length and content |
|---|---|---|---|
| code-a-bot | CODE_A_BOT | 2 (medium) | the 5 medium levels in order |
| sudoku | SUDOKU | 2 (medium) | 1 puzzle, medium number of blanks (`CELLS_TO_REMOVE.medium`), unique solution |
| math-challenge | MATH_CHALLENGE | 2 (medium) | 15 questions, addition, subtraction, multiplication, division |
| math-maze | MATH_MAZE | 2 (medium) | one 10x10 maze, 5 to 8 gates, 4 to 6 collectibles |
| word-puzzle | WORD_PUZZLE | 2 (medium) | one medium grid and word list per language |
| hangman | HANGMAN | 2 (medium) | 5 medium words per language |

The other 10 games are listed in the rotation (FR-DC-14) but disabled until they have a generator
(FR-DC-15); their settings default to medium and are fixed in the functional design of the run that adds
them. When a premium game (scratch-coding, space-entry, bond-and-burn, mini-golf) joins, a validated
challenge start lets free users play it (FR-DC-16).

### Q8. Open point: how far into DC3 does this run go?
[Answer]: The first batch only: code-a-bot, sudoku, math-challenge, math-maze, word-puzzle, hangman. The
other 10 games (geo-quiz, history-quiz, civics-quiz, sequence-memory, pattern-recall, memory-match,
scratch-coding, space-entry, bond-and-burn, mini-golf) stay out of the draw and are added later, one
game per pull request, each with its generator, web mode and app mode. Six games give a varied rotation
with no repeats on consecutive days.

### Q9. Open point: privacy policy text (NFR-DC-2)
[Answer]: Implemented in DC4 in `apps/web/src/pages/legal/PrivacyPage.tsx`. Draft:
- What we collect: "If you allow notifications in the iPhone app, a push token for your device, the
  device's time zone and language. Your time zone, so the daily summary and the challenge reminder arrive
  at the right local time."
- How we use it: "To send the morning summary and the daily challenge reminder when 'Daily emails and
  notifications' is on."
- What other people can see: "Your username and your best score on the daily challenge leaderboard,
  shown to other signed-in players."
- Who we share it with: "Amazon Web Services (Amazon SNS) and Apple (Apple Push Notification service):
  delivery of push notifications."
- How long we keep it: "A push token until you sign out on that device, delete your account, or Apple
  reports it as no longer valid. Daily challenge scores as long as your account exists."
- Deleting your account: "also removes your devices and your daily challenge scores."

### Q10. Permission soft-ask and the single toggle (FR-DC-1, FR-DC-4)
[Answer]: The explanation names the morning summary and the noon challenge, which are only sent when the
toggle is on. So the app shows the explanation after a finished game when it has not been shown on this
device and the toggle is on; turning the toggle on in Profile shows it if it was never shown. "Allow"
opens the iOS prompt; "Not now" records that it was shown. The toggle is never changed by the
explanation. Flagged for owner review.

### Q11. Branches and pull requests
[Answer]: One branch per unit, chained in build order, each cut from the previous one: DC2
`feat/dc2-challenge-core` (from `feat/daily-challenge`), DC3 `feat/dc3-repeatable-content`, DC1
`feat/dc1-notifications-backend`, DC4 `feat/dc4-web-challenge`, DC5 `feat/dc5-app-challenge-push`. Each
unit opens a pull request against `main`; a later pull request also contains the earlier units' commits,
so they merge in order. Every unit is safe to merge alone: new features stay off until their table
names are set in the Lambda environment (fail closed).

## Approval

Self-approved 2026-11-26 under the owner's delegation; logged in `aidlc-docs/audit.md`.
