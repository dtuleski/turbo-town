# DC2 Challenge Core: Business Logic Model

Flows S1 to S3 of `inception/application-design/daily-challenge-services.md`, at code level. Rule ids
from `business-rules.md`.

## 1. Day helpers (`day.ts`)

- `localParts(at, tz)`: `Intl.DateTimeFormat('en-US', { timeZone: tz, year, month, day, hour, minute,
  hourCycle: 'h23' }).formatToParts(at)` gives `{ date: 'YYYY-MM-DD', hour, minute }` (hour 24 read as 0).
- `challengeDayOf(at)` = `localParts(at, 'America/New_York').date`.
- `challengeDayBounds(day)`: guess = `Date.UTC(y, m - 1, d)`; offset(t) = wall-clock of `t` in New York
  read as UTC, minus `t`; start = guess - offset(guess - offset(guess)) (two passes settle the DST
  offset; Eastern midnight is never inside a DST gap); end = bounds of `addDays(day, 1)`.start.
- `addDays(day, n)`: UTC date arithmetic on the calendar date, formatted back to `YYYY-MM-DD`.

Examples: `challengeDayOf(2026-01-15T04:59Z)` = 2026-01-14; `05:00Z` = 2026-01-15;
`challengeDayBounds('2026-03-08')` = 05:00Z to 2026-03-09T04:00Z (23 h);
`challengeDayBounds('2026-11-01')` = 04:00Z to 2026-11-02T05:00Z (25 h);
`localParts(2026-01-15T12:00Z, 'Asia/Kolkata')` = 2026-01-15 17:30.

## 2. Draw and ensure (S1)

```text
ensureChallenge(day):
  item = repo.getChallenge(day); if item: return item
  prev = repo.getChallenge(addDays(day, -1))
  entry = drawChallenge(day, eligibleRotation(), prev?.gameId)
  content = generateContent(entry, day)
  created = repo.createChallenge({ day, entry fields, content, createdAt: now })   # attribute_not_exists(pk)
  if created == 'exists': return repo.getChallenge(day) or fail
  return the new item
```

`drawChallenge(day, eligible, previousGameId)`: candidates = eligible minus `previousGameId` when 2 or
more are eligible; `pick(mulberry32(seedFrom('draw:' + day)), candidates)`.

## 3. Start (S2, server)

```text
GameService.startGame(userId, input):
  tier = getTier(userId)
  quest validation (unchanged)
  if input.challengeContext present:
    no service -> ValidationError(CHALLENGE_UNAVAILABLE_MESSAGE)
    challengeDay = challengeService.validateStart(input.challengeContext, themeId, difficulty).day
  if not challengeDay and themeId in PAID_GAME_THEME_IDS and tier FREE -> AuthorizationError (unchanged)
  Super Hard gate, checkLimit, validateTheme (unchanged)
  create game { ..., challengeDay }
  incrementUsage (unchanged)

ChallengeService.validateStart(raw, themeId, difficulty):
  raw not an object or day not isChallengeDay -> reject BAD_SHAPE
  day != challengeDayOf(now)                 -> reject WRONG_DAY
  challenge = ensureChallenge(day); error    -> reject UNAVAILABLE (logged as error)
  theme or difficulty differ                 -> reject MISMATCH
  return { day }
```

## 4. Completion (S2, server)

```text
GameService.completeGame (generic path), after finalizeQuest:
  challenge = finalizeChallenge(userId, username, game, score, input)   # try/catch -> undefined
  return { ..., ...(challenge ? { challenge } : {}) }

ChallengeService.applyCompletion(userId, username, game, score, metrics):
  day = game.challengeDay
  challengeDayOf(now) != day              -> not recorded (LATE)
  challenge = repo.getChallenge(day); none -> not recorded (NO_CHALLENGE)
  theme or difficulty differ               -> not recorded (MISMATCH)
  totals = expectedTotals(challenge.content)
  any totals[k] != metrics[k], or correct > total, or found > words -> not recorded (TOTALS)
  { updated, best } = repo.putBestScore(day, userId, username, score, now)
  rank = 1 + repo.countAhead(day, best.rankKey)
  return { day, recorded: true, bestScore: best.bestScore, rank, isNewBest: updated }
```

`putBestScore` writes the whole SCORE item with
`ConditionExpression: 'attribute_not_exists(bestScore) OR bestScore < :s'`. A
`ConditionalCheckFailedException` means "kept": it re-reads the stored item and returns
`{ updated: false, best }`.

## 5. Leaderboard and today (S3)

```text
getToday(userId):
  day = challengeDayOf(now); c = ensureChallenge(day)
  return { c fields, endsAt: challengeDayBounds(day).end, me: myEntry(day, userId) }

getLeaderboard(userId, rawDay, rawLimit):
  day = rawDay ?? today; validate (BR-L2); limit = clamp(rawLimit)
  c = day == today ? ensureChallenge(day) : repo.getChallenge(day); none -> null
  top = repo.topScores(day, limit)                      # rank-index, ascending, Limit
  entries = top with rank = position + 1, isMe = (userId equal)
  me = my entry from top if present, else myEntry(day, userId)
  return { day, gameId, themeId, final: day < today, entries, me }

getDayResults(day, userId?, limit = 3):                  # used by the DC1 digest
  { challenge: repo.getChallenge(day), top: repo.topScores(day, limit), me: userId ? myEntry : null }
```

`myEntry(day, userId)`: SCORE item or null; rank = 1 + `countAhead(day, rankKey)`.

## 6. Account deletion

After the theme-leaderboard deletion and before the subscription record:
`if env.DAILY_CHALLENGE_TABLE_NAME: deleteByQuery(table, { IndexName: 'user-index',
KeyConditionExpression: 'userId = :u' }, ['pk', 'sk'])`.
