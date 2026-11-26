# Daily Challenge and Push: Requirements

Depth: standard. Source: owner requests and decisions of 2026-11-26 (audit.md), answers in
`daily-challenge-requirement-verification-questions.md` (all A). Phase 1 (digest on by default for
new accounts) shipped separately (PR #41) and is listed here only as context.

## 1. Intent

Bring players back every day: a daily summary they can read as an email or a push, and one shared
daily challenge with its own leaderboard, announced at noon and summarised the next morning.

## 2. Functional requirements

### Notifications and the single toggle

- **FR-DC-1** One user setting, shown as "Daily emails and notifications", controls the digest email
  and every push. Off means no digest email and no push of any kind. (D4)
- **FR-DC-2** New accounts start with the setting on (Phase 1, live). Existing accounts without a saved
  choice stay off. (D5, owner delegation)
- **FR-DC-3** The iPhone app can receive push notifications. Android push is not built now; the
  backend design must allow adding it later without a data migration. (Q8 A)
- **FR-DC-4** The app asks for notification permission after the user's first finished game: first a
  short in-app explanation that names what will be sent (the morning summary and the noon challenge)
  with "Allow" and "Not now", then the iOS prompt only on "Allow". The app never shows the iOS prompt
  without the explanation. (Q7 A; App Store Guideline 4.5.4)
- **FR-DC-5** The backend keeps a list of the user's devices that accepted notifications: push token,
  platform, time zone, language and last update. A device is removed on sign-out, on account deletion
  and when Apple reports the token as invalid.
- **FR-DC-6** Notification texts and the challenge texts use the user's language (English, Spanish,
  Portuguese), English when unknown. (Q11 A)

### Local time

- **FR-DC-7** The web app and the iPhone app save the user's IANA time zone (for example
  `America/Chicago`) at sign-in and whenever it changes. Until a time zone is known, US Eastern
  (`America/New_York`) is used. (Q6 A)
- **FR-DC-8** The digest email is sent at 8am in the user's local time, every day. (D1)
- **FR-DC-9** The digest push is sent at 8am local time, together with the email, to users with the
  setting on and at least one registered device. (Q5 A)
- **FR-DC-10** Each user receives at most one digest email, one digest push and one challenge push per
  local day, even if a scheduled run is retried.

### Daily challenge

- **FR-DC-11** Each challenge day has exactly one challenge: one game with fixed settings (difficulty,
  length) and a shared content seed, so every player gets the same puzzle. (Q13 A)
- **FR-DC-12** A challenge day runs from midnight to 11:59:59pm US Eastern time. Results are final at
  midnight Eastern. (Q3 A)
- **FR-DC-13** The backend picks each day's challenge at random from the rotation, never the same game
  two days in a row. The settings per game are fixed in the rotation configuration, approved once by
  the owner. The choice is made ahead of time, so it is the same for every server and every retry.
  (Q13 A)
- **FR-DC-14** The rotation holds the 16 games listed in the questions file (memory-match,
  math-challenge, word-puzzle, sudoku, sequence-memory, code-a-bot, geo-quiz, history-quiz,
  civics-quiz, hangman, scratch-coding, math-maze, pattern-recall, space-entry, bond-and-burn,
  mini-golf). (Q1 A)
- **FR-DC-15** A game joins the rotation only when it can produce the same puzzle from the shared seed,
  on the web and in the app. Until then it is left out of the draw. (Q2 A)
- **FR-DC-16** Everyone can play the challenge, free users included. A challenge game counts as a
  normal play against the daily play limit (free users keep 3 plays a day). (D3)
- **FR-DC-17** Players may play the challenge as many times as their plays allow. The leaderboard ranks
  each player's best score for the day. (D2)
- **FR-DC-18** Ties on the challenge leaderboard: the player who reached the tied score first ranks
  higher. (Q4 A)
- **FR-DC-19** A challenge score counts only if the game was played with the day's challenge settings
  and seed, and finished during the challenge day. The server checks this; the client cannot choose
  the game, settings or day of a challenge score.
- **FR-DC-20** A challenge game also counts on the game's normal leaderboards, as any other game would.
- **FR-DC-21** The web app and the iPhone app show the challenge as a card at the top of the game list:
  the game, a Play button, the user's best score and rank today, and today's leaderboard. (Q9 A)
- **FR-DC-22** At 12pm local time, users with the setting on get a push naming today's challenge game.
  Users who already played today's challenge do not get it. (D6, Q12 A)
- **FR-DC-23** Tapping the challenge push opens the app on the challenge card; tapping the digest push
  opens yesterday's challenge results.

### Next-morning results

- **FR-DC-24** The digest email and the digest push include yesterday's challenge: the game, the winner
  and the top 3, and the user's own score and rank when they played. A user who did not play sees the
  winner and the top 3 and an invitation to today's challenge. (Q10 A)

## 3. Non-functional requirements

- **NFR-DC-1 Security (Security Baseline enabled)**: device registration and challenge scores accept
  only the caller's own user id from the verified token; push tokens are never returned to other
  users or exposed in logs; the APNs signing key is stored in Secrets Manager, never in code or
  environment variables in plain text; least-privilege IAM for every new table and service.
- **NFR-DC-2 Privacy**: the privacy policy is updated before release to cover push tokens, time zone
  and the challenge leaderboard; account deletion also removes devices and challenge scores.
- **NFR-DC-3 Delivery time**: a scheduled email or push arrives within 15 minutes of the target local
  time.
- **NFR-DC-4 Scale**: the scheduler handles 10,000 users without redesign (today about 50).
- **NFR-DC-5 Reliability**: a failed push to one device never stops the run for others; invalid tokens
  are removed; a run can be retried without duplicate sends (FR-DC-10).
- **NFR-DC-6 Cost**: no new paid service beyond AWS usage charges; email stays on Resend.
- **NFR-DC-7 Compatibility**: the existing digest content, the existing leaderboards and the rate limit
  rules keep working unchanged for users who do not use the new features.

## 4. Out of scope

- Android push (backend ready for it, app work later).
- Choosing notification types separately (one toggle by decision D4).
- Prizes or rewards for challenge winners.
- Admin override of upcoming challenges (Q13 A chose the automatic draw only).

## 5. Open items carried into design

- Which of the 16 games already produce the same puzzle from a seed, on web and in the app, and the
  work needed for the others (FR-DC-15). This decides the first rotation and the size of the work.
- The fixed settings per game for the rotation (FR-DC-13), proposed in design for the owner to approve.
- The privacy policy text for push tokens and time zone (NFR-DC-2).
- APNs signing key: the owner creates it in the Apple Developer account (Keys, "Apple Push
  Notifications service") and enables Push Notifications on the app id.
