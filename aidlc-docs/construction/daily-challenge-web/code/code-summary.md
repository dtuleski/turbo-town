# DC4 Web: Code Summary
Branch `feat/dc4-web-challenge`. Plan: `../../plans/daily-challenge-web-code-generation-plan.md`.
All paths under `apps/web/src/`.
## New files
| File | Component | Purpose |
|---|---|---|
| `hooks/useNotificationSettingsSync.ts` | W7 | `NOTIFICATION_SETTINGS_KEY`, `browserTimeZone()`, `currentNotificationSettings(userId, language)`, `syncNotificationSettings(current, storage, save)` (pure, never throws), `useNotificationSettingsSync()` |
| `components/challenge/DailyChallengeCard.tsx` | W5 | `loadDailyChallengeCard()` (null when off or on error), `DailyChallengeCardView({ data, failed })`, `hasChallengeFailedFlag`, `resultsUrl(day)`, default container |
| `pages/challenge/ChallengeResultsPage.tsx` | W6 | `resultsDay(search)`, `formatChallengeDay(day, language)`, `ChallengeResultsView({ loading, data })`, default page |
| `test/challengeFixtures.ts` | tests | `makeChallenge`, `makeEntries`, `makeLeaderboard`, `DAY` |
## Changed files
| File | Change |
|---|---|
| `api/challenge.ts` | `saveNotificationSettings(input)`: mutation, throws on error |
| `components/layout/AppLayout.tsx` | calls `useNotificationSettingsSync()` (signed-in layout only) |
| `config/constants.ts` | `ROUTES.CHALLENGE_RESULTS = '/challenge/results'` |
| `App.tsx` | route for the results page inside the protected layout |
| `pages/hub/GameHubPage.tsx` | `<DailyChallengeCard />` directly above `<QuestHubCard />` |
| `locales/{en,es,pt}.json` | `challenge.{games.<16 rotation game ids>, card.*, you, results.*}`; `profile.dailyDigest` "Daily emails and notifications", `dailyDigestDesc` (morning summary and daily challenge), `dailyDigestOn` "✓ Every morning at 8am your time" |
| `pages/legal/PrivacyPage.tsx` | plan Q9 text in collect, use, visibility, sharing, retention and deletion sections; "turn emails and notifications off" |
## Behavior notes
- The card is hidden while loading, when `getDailyChallenge` returns null (feature off) and on any error.
  When only the leaderboard fails (or answers for another day around midnight), the card shows without
  the top 5. A game without a web challenge mode has no Play link.
- `/hub?challengeFailed=1` (set by DC3 on a failed challenge start) shows "This challenge is not available
  right now." above the card, also when the card itself is hidden.
- The sync compares user id as well as zone and language, so a second account on the same browser gets
  its own save. A failed save is retried on the next load; nothing is saved for signed-out visitors.
- The results page needs sign-in (the leaderboard query is authenticated). The digest email links to it.
- Privacy text deviation from the Q9 draft: the collect item says "Your time zone and language", because
  the web saves the UI language for every signed-in user, not only for devices.
- The legal effective date stays `November 26, 2026` (`LEGAL_EFFECTIVE_DATE` in `pages/legal/LegalLayout.tsx`),
  which is the date of this update.
