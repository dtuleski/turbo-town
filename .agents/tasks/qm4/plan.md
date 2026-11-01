# Code Generation Plan - QM4 Rewards and Polish (apps/web only)
Source: quest-map-unit-of-work.md QM4; QM3 patterns (SSR markup tests, props-driven components, funnel imports).
Badges come from `world.badges` in getQuestProgress (server decides; web never recomputes). Backend AchievementType enum untouched.
- [x] 1. `src/utils/questBadges.ts`: badge derivation (known ids only, earned flag per world, summary counts, justEarned keys)
- [x] 2. `src/components/quest/BadgeShelf.tsx`: per-world shelf, locked/earned with text + icon, animated unlock vs static marker under reduced motion
- [x] 3. Wire shelf in `QuestMapPage.tsx` (justEarned from questResultStore badgesAwarded)
- [x] 4. `src/components/quest/QuestAchievementsSection.tsx` + wire into `AchievementsPage.tsx` via useQuestProgress
- [x] 5. Locales en/es/pt `quest.badges.*`, `quest.achievements.*`
- [x] 6. Tests: questBadges, BadgeShelf (locked/earned/reduced-motion), QuestAchievementsSection, locale gate stays green
- [x] 7. Verify: tsc, vitest, build, lint, shared jest; verification.md
- [x] 8. Commit + push; audit entry; tick QM4 in state
