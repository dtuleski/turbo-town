# QM4 verification
- apps/web `npx tsc --noEmit`: exit 0
- apps/web `npx vitest run`: 44 files, 827 tests, all pass. Compared to QM3 baseline (31 files, 629 tests, 1 pre-existing failure): the registry failure was already fixed in QM3 commit ad4b906; QM4 added 2 files (questBadges.test.ts, BadgeShelf.test.tsx) with 19 new tests. No regressions.
- apps/web `npm run build`: exit 0
- apps/web eslint on new/edited quest files: clean (repo-wide `npm run lint` has pre-existing errors in unrelated files; not touched)
- packages/shared `npx jest --ci`: 23 suites, 532 tests pass
- services/game: unchanged (no edits)
- Locale gates (localeCompleteness, questLocaleCompleteness): pass with new quest.badges.* and quest.achievements.* in en/es/pt
- Visual check: not run (no headless browser tooling used this iteration); no screenshots produced. No server started.
- Reduced motion: tested via the reducedMotion prop of BadgeShelf (no data-animated, no transform style, static "New" marker); the page feeds it from framer-motion useReducedMotion. No media-query mock, since the node-env SSR tests cannot run matchMedia.
