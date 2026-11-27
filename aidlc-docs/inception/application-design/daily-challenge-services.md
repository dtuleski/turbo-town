# Daily Challenge and Push: Services and Flows

## S1. Daily draw (FR-DC-11 to FR-DC-15)

1. `ChallengeService.ensureChallenge(day)` reads the day's `CHALLENGE` item; if present, returns it.
2. Otherwise it reads the previous day's item (for `previousGameId`), calls
   `drawChallenge(day, eligibleRotation(), previousGameId)`, then `generateContent(entry, day)`.
3. It writes the item with `attribute_not_exists(pk)`. If another writer won, it re-reads and returns
   the stored item. The stored item is the truth: any server, retry or later code version serves it.
4. Callers: the digest tick (today and tomorrow, so the day exists before anyone needs it) and, as a
   fallback, `getDailyChallenge` and `validateStart` for today.
5. With one eligible game the no-repeat rule cannot apply and the same game repeats; with two or more,
   the previous day's game is excluded.

## S2. Play a challenge (FR-DC-16, FR-DC-19, FR-DC-20)

Web: the card links to the game page with `?difficulty=medium&challenge=<day>`. `startGame` in
`src/api/game.ts` reads the param (like `quest=`) and sends `challengeContext: { day }`. The page loads the
content through `useChallengeContent` and plays it. App: the same with the `challenge` query parameter
on the play route.

Server, `startGame`:
1. If `challengeContext` is present: `validateStart` checks the day format, that it equals
   `challengeDayOf(now)`, that the challenge exists (ensuring it), and that `themeId` and `difficulty`
   match it. Any failure throws one generic message (`CHALLENGE_UNAVAILABLE_MESSAGE`) before the rate
   limit, so it costs no play.
2. Paid-game gate: skipped only for a validated challenge start. Super Hard gate unchanged (challenges
   use difficulty 2).
3. Rate limit check and increment as for any game: the challenge is a normal play (D3).
4. The game record stores `challengeDay`.

Server, `completeGame` (normal path unchanged; the score is computed and saved as today):
1. `finalizeChallenge` runs after `finalizeQuest` when `game.challengeDay` is set.
2. Recorded only when `challengeDayOf(now) === game.challengeDay` (finished during the day) and the
   reported totals equal `expectedTotals(content, language)` (for language-dependent games the totals are
   the same in every language) and `correctAnswers <= totalQuestions`.
3. Conditional update of the user's `SCORE#` item: replaces only a strictly higher score, so ties keep the
   earlier time (FR-DC-18) and the best attempt ranks (FR-DC-17).
4. Rank = 1 + count of `rankKey` values lower than the user's on `rank-index`.
5. Returns `challenge: { day, recorded, bestScore, rank, isNewBest }`. Any error: logged, `challenge: null`,
   the completion still succeeds. The `GameCompleted` event is published as for any game, so the normal
   leaderboards count it (FR-DC-20).

## S3. Leaderboard and card (FR-DC-21)

`getDailyChallenge` returns today's challenge with `me` (best and rank). `getChallengeLeaderboard(day,
limit)` returns the top entries with usernames and `isMe`, plus `me` when outside the top; `final` is true
when the day has ended. Day: today or an earlier valid day; future days are rejected with a validation
error.

## S4. Device registration (FR-DC-3, FR-DC-5)

1. App, after "Allow" and the iOS prompt: the platform channel returns the APNs token; the app calls
   `registerPushDevice({ token, platform: IOS, environment, timeZone, language })`.
2. Server validates, computes `deviceId = sha256('IOS:' + token)`, upserts the item with the caller's
   `userId` (a token previously owned by another user moves to this user), and keeps any existing
   `endpointArn` only when the token is unchanged.
3. Sign-out: the app calls `unregisterPushDevice(token)` before clearing its tokens; the server deletes the
   item only when owned by the caller and deletes the SNS endpoint (best effort).
4. Account deletion: devices for the user (via `user-index`) and their endpoints are deleted.

## S5. Scheduler tick (FR-DC-8 to FR-DC-10, FR-DC-22, FR-DC-24, NFR-DC-3 to NFR-DC-5)

Runs every 15 minutes in `DashDen-DailyEmail-<stage>`.
1. `ensureChallenge(today)` and `ensureChallenge(tomorrow)` (Eastern days). Failure is logged; email still
   goes out without the challenge section.
2. Scan email prefs with `dailyDigest = true` (unchanged filter; off means nothing is sent, FR-DC-1).
3. Per user: zone = saved `timeZone` if valid, else the most recent device zone, else
   `America/New_York` (FR-DC-7). `dueSends` marks the digest due from 08:00 to 08:59 local and the
   challenge push due from 12:00 to 12:59 local, each only when its claim for that local date is not taken.
   The one-hour window lets the next runs catch a missed run; delivery is within 15 minutes when runs
   succeed (NFR-DC-3).
4. Digest email (existing content plus the challenge section) is built once per email address as today;
   claim `DigestEmail`, send through Resend, release the claim on failure.
5. Digest push: users with at least one device; claim `DigestPush`; text from yesterday's results.
6. Challenge push: users with a device who have no `SCORE#` item for today's challenge (FR-DC-22); claim
   `ChallengePush`.
7. Push sending (N6): one device failing never stops others (NFR-DC-5); `EndpointDisabled` or an
   invalid-token error removes the device and its endpoint. When APNs is not configured, pushes are
   skipped and claims are not taken.
8. Shared data (yesterday's top players, aggregates, yesterday's challenge results) is loaded once per run
   and only when at least one user is due.
9. One summary log line per run. The handler throws only when the whole run cannot start (the prefs scan
   fails), so EventBridge retries are safe.

"Yesterday's challenge" in a digest is `addDays(challengeDayOf(now), -1)`: the latest day that is final
at send time. For US users at 8am local this is their local yesterday.

## S6. Locale sync (FR-DC-6, FR-DC-7)

Web after sign-in and app after sign-in and on resume: `saveNotificationSettings({ timeZone, language })`
when the values differ from the last saved ones (kept locally). The server validates and stores them on
the email-prefs item with UpdateItem (creating the item without `dailyDigest`, so an account with no
choice stays off).

## S7. Push tap routing (FR-DC-23)

Push payload carries `route`: `/` for the challenge push (the card is at the top of the hub) and
`/challenge/results?day=<yesterday>` for the digest push. The app routes on tap, after sign-in if needed.
The digest email links to `https://dashden.app/challenge/results?day=<yesterday>`.

## S8. Release order (each merge is safe alone)

1. Merge DC2, DC3, DC1, DC4 in order (CI deploys the Game Lambda and the web). Features stay off: no
   table env vars yet, `getDailyChallenge` returns null, the card is hidden, device APIs answer `ok: false`.
   DC1 changes `setPrefs` (the Profile toggle) from PutItem to UpdateItem. Production step P0 grants
   UpdateItem before DC1 is merged; if P0 has not been done, `setPrefs` falls back to a read-merge
   PutItem on `AccessDeniedException`, so the toggle (and the digest opt-out) keeps working.
2. Owner runs the production steps (tables, IAM, env vars). The challenge appears on the web.
3. Owner deploys the digest Lambda with `scripts/deploy-daily-email-lambda.sh` and changes the schedule
   to every 15 minutes in the same session, between 00:00 and 11:45 UTC: the old 12:00 UTC run then never
   fires that day, so US users get exactly one digest at their 8am (users east of UTC whose 8am already
   passed miss that one day).
4. Owner creates the APNs key, secret and SNS platform application; then ships the app (DC5) through
   TestFlight.
