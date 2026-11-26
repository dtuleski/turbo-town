# Daily Challenge and Push: Workflow Planning

Self-approved under the owner's delegation ("I want to defer to all your recommendations. Just go!!",
2026-11-26). Inputs: `../requirements/daily-challenge-requirements.md`, reverse-engineering artifacts.

## 1. Key finding for planning: no game repeats a puzzle today

Checked the 16 rotation games in both clients (2026-11-26):

| Game | Web content | App content | Repeatable today |
|---|---|---|---|
| code-a-bot | fixed levels | fixed levels | yes, given a fixed level |
| the other 15 | `Math.random` in `apps/web/src/utils/*` (word puzzle 9 calls, geo quiz 8, mini golf physics 12, ...) | Dart `Random()` in `apps/mobile/lib/game/*` | no |

The web and the app have separate generators, so a shared seed alone would still give different
puzzles on the two platforms.

**Design direction (for Application Design):** generate each challenge's content once, in one place,
from the day's seed: a seeded generator per game in `packages/shared` (TypeScript, already used by the
web and the backend). The backend stores the generated content with the challenge. The web plays it
directly; the app receives it as data from `getDailyChallenge` and plays it in a "given content" mode.
One generator per game means the same puzzle everywhere by construction. Mini Golf's random physics
noise must also come from the seed.

Consequence: each game needs (a) a seeded generator in shared, (b) a given-content mode on the web,
(c) a given-content mode in the app. FR-DC-15 lets games join the rotation one by one.

## 2. Stages

| Stage | Decision | Reason |
|---|---|---|
| User Stories | Skip | One persona (parent account holder, players under it); requirements are concrete and owner-approved; acceptance criteria are written per unit instead |
| Application Design | Execute (standard) | New components: scheduler, push sender, device registry, challenge service, shared seeded generators |
| Units Generation | Execute (minimal) | Five units below |
| Functional Design | Per unit, DC2 and DC3 (rules: draw, validation, ranking; generator contracts) | New business rules |
| NFR Requirements and Design | DC1 only (delivery window, idempotency, secrets) | Other units inherit existing patterns |
| Infrastructure Design | DC1 and DC2 (tables, schedule rule, SNS platform app, IAM) | New AWS resources |
| Code Generation | All units | |
| Build and Test | Yes | |

## 3. Units and order

| Unit | Scope | Depends on |
|---|---|---|
| DC2 Challenge core | Rotation config and fixed settings; deterministic draw by Eastern date (no repeat); challenge storage; `getDailyChallenge`, `getChallengeLeaderboard`; challenge scores through `completeGame` with server-side checks; best score per user and day, earliest-first ties; data for the digest section | none |
| DC3 Repeatable content | Seeded generators in `packages/shared`, web and app given-content modes. First batch: code-a-bot, sudoku, math-challenge, math-maze, word-puzzle, hangman; then the quizzes, sequence memory, pattern recall, memory match, space coder, space entry, bond and burn, mini golf | DC2 contracts |
| DC1 Notifications backend | Time zone and language on the user's settings; device registry; APNs through Amazon SNS; a 15-minute scheduler that sends the 8am digest email and push and the 12pm challenge push in local time; once-per-day guarantee; invalid-token cleanup; account deletion extended | DC2 (challenge data for texts) |
| DC4 Web | Challenge card and leaderboard; time zone save; toggle renamed; digest email sections (challenge results); privacy policy update | DC1, DC2, DC3 |
| DC5 App | Permission explanation and prompt after the first finished game; device registration; push tap routing; challenge card; toggle renamed; time zone save; given-content play | DC1, DC2, DC3 |

Release: backend and web first (the challenge works on the web as soon as DC2, DC3 first batch and DC4
ship); the app with push in the next TestFlight build, after the owner creates the APNs key.

## 4. Owner actions needed

1. Apple Developer, Identifiers: on `app.dashden.dashdenMobile`, tick **Push Notifications** and save.
2. Apple Developer, Keys: create a key with **Apple Push Notifications service (APNs)**, download the
   `.p8`, and share the Key ID.
3. Approve the per-game challenge settings when Functional Design proposes them (DC2).

## 5. Size

Large: about the size of the payments work for DC1, DC2, DC4 and DC5 together, plus DC3 at roughly one
to two days per game for the 15 games that need a seeded generator on both platforms.
