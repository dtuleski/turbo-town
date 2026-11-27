# DC4 Web: Code Generation Plan
Unit DC4, branch `feat/dc4-web-challenge` (cut from `feat/dc1-notifications-backend` at 3e8094c).
Components W1 (`saveNotificationSettings`), W5, W6, W7, W8 of
`inception/application-design/daily-challenge-components.md`. Self-approved 2026-11-26 under the owner's
delegation. All paths below are under `apps/web/src/`.
## Steps
- [x] 1. W1: `api/challenge.ts` adds `saveNotificationSettings({ timeZone?, language? })` (mutation
      `saveNotificationSettings(input)`, DC1). Throws on error so the caller does not remember unsaved
      values. Test: `api/__tests__/challengeSettings.test.ts`.
- [x] 2. W7: `hooks/useNotificationSettingsSync.ts`. Browser zone from
      `Intl.DateTimeFormat().resolvedOptions().timeZone`, language = base code of `i18n.language`
      (`challengeLanguage`, fallback `en`). Saves when `{ userId, timeZone, language }` differs from
      localStorage `dashden.notificationSettings`; stores it only after a successful save. Mounted once in
      `components/layout/AppLayout.tsx` (the signed-in layout inside `ProtectedRoute`), effect keyed on
      `isAuthenticated`, user id and language. Test: `hooks/__tests__/useNotificationSettingsSync.test.ts`.
- [x] 3. W5: `components/challenge/DailyChallengeCard.tsx` above `QuestHubCard` in
      `pages/hub/GameHubPage.tsx`: game name `challenge.games.<gameId>`, Play link from
      `buildChallengeUrl`, own best and rank, top 5 from `getChallengeLeaderboard(undefined, 5)`, "ends at
      midnight Eastern Time", link to the results page. Nothing while loading, when off, or on error; the
      `challengeFailed=1` notice. Test: `components/challenge/__tests__/DailyChallengeCard.test.tsx`.
- [x] 4. W6: `pages/challenge/ChallengeResultsPage.tsx`, `ROUTES.CHALLENGE_RESULTS = '/challenge/results'`
      (`?day=`, today when missing or invalid), registered in `App.tsx` inside the protected layout: game,
      winner, top 10, own rank. Test: `pages/challenge/__tests__/ChallengeResultsPage.test.tsx`.
- [x] 5. W8 strings: `challenge.*` in `locales/{en,es,pt}.json`; `profile.dailyDigest`,
      `dailyDigestDesc`, `dailyDigestOn` renamed (8am your time). Test:
      `locales/__tests__/challengeLocaleCompleteness.test.ts`.
- [x] 6. W8 privacy: `pages/legal/PrivacyPage.tsx` with the plan Q9 text. Test:
      `pages/legal/__tests__/PrivacyPage.test.tsx`.
- [x] 7. Build and Test: web tsc, vitest, build; summary
      `construction/build-and-test/daily-challenge-web-build-and-test-summary.md`.
