# DC3 Repeatable Content: Business Rules

## Content generation (C6)

- **BR-C1 Seeded only.** Generators take `(entry, rng)` where `rng = mulberry32(seedFrom(`${day}:${gameId}`))`.
  No `Math.random`, no clock, no I/O. The same day and game always give the same content on any server.
- **BR-C2 Settings from the rotation.** Sizes come from `entry.settings` (plan Q7): sudoku `blanks: 46`;
  math-challenge `questions: 15`; math-maze `size: 10, gatesMin: 5, gatesMax: 8, collectiblesMin: 4,
  collectiblesMax: 6`; word-puzzle `gridSize: 12, words: 8`; hangman `words: 5`. A missing setting falls
  back to the same medium value.
- **BR-C3 Sudoku.** Full grid by shuffled backtracking; cells removed in shuffled order only while the
  puzzle keeps exactly one solution; at most `blanks` removed.
- **BR-C4 Math Challenge.** Operation picked uniformly from addition, subtraction, multiplication,
  division; operands as the web medium (add/sub 1 to 50, subtrahend at most the minuend; mul/div 2 to
  12, division exact); a question never equals the one before it (up to 10 redraws).
- **BR-C5 Word Puzzle.** Per language: shuffle the de-duplicated medium list; place words in shuffled
  directions (horizontal, vertical, diagonal down-right; 50 tries per direction); a word that does not
  fit is skipped; stop at `words` placed; fill blanks with random `A` to `Z`. Every listed word is in the
  grid and every language has the same word count.
- **BR-C6 Hangman.** Per language: the first `words` entries of the shuffled medium list.
- **BR-C7 Math Maze.** Port of the web medium maze (recursive backtracker, 3 extra passages, start
  top-left, exit bottom-right, at least 2 distinct paths); gates on cells that can be bypassed, shortest-
  path cells first, each with a medium equation; collectibles off every shortest path. Built again from
  the same rng until gates are 5 to 8, collectibles at least 4 and the exit is reachable (at most 50
  builds).
- **BR-C8 Languages.** One sub-rng per language, `mulberry32(floor(rng() * 2^32))`, taken in the order
  en, es, pt.
- **BR-C9 Eligibility.** The six first-batch games have generators and are therefore eligible
  (FR-DC-15); the other 10 rotation entries stay out of the draw. The web's own generators are unchanged.
- **BR-C10 Stored content wins.** A change to a generator or a list affects only days not yet drawn; a
  stored `CHALLENGE` item is served as is (DC2 BR-D4).

## Completion totals (C7)

- **BR-T1** `expectedTotals` per game as in `domain-entities.md`; the server records a completion only
  when the reported totals equal them (DC2 rule, unchanged).

## Web given-content mode (W2 to W4)

- **BR-W1 Off without the param.** Without a valid `challenge=<YYYY-MM-DD>` the hook status is `off` from
  the first render, nothing is loaded and each page runs its original generator and start code (NFR-DC-7).
- **BR-W2 Load before start.** With the param, the page shows a loading screen, loads today's challenge
  and starts the game only once the content is for this page's game and the param's day; the start uses
  the challenge's difficulty (medium) and carries `challengeContext: { day }`.
- **BR-W3 Unusable challenge.** Feature off, load error, another game or another day: the player goes to
  `/hub?challengeFailed=1` and no game is started (no play used).
- **BR-W4 Start failure.** With a valid `challenge` param and no valid `quest` param: a rate-limit error
  reaches the page (rate-limit screen); any other error goes to `/hub?challengeFailed=1` and the start
  never settles. An accepted start is playable (`canPlay: true`, as Quest rule R1).
- **BR-W5 Quest priority.** When `quest` and `challenge` are both valid, the quest context is sent and the
  challenge param is ignored.
- **BR-W6 Language.** Word Puzzle and Hangman play the variant for the base code of `i18n.language`
  (`pt-BR` -> `pt`); unsupported languages play `en`. Totals are the same in every language.
- **BR-W7 Launch URL.** `buildChallengeUrl` returns `<game route>?difficulty=medium&challenge=<day>` for
  the six themes (`CODE_A_BOT`, `SUDOKU`, `MATH_CHALLENGE`, `MATH_MAZE`, `WORD_PUZZLE`, `HANGMAN`) and
  null otherwise; values go through `URLSearchParams`.

## App given-content mode (M1 to M3)
- **BR-M1 Off without the param.** Play routes pass `challengeDay` only for a real `challenge=<YYYY-MM-DD>`
  and no valid `quest` param (BR-W5); otherwise the screens build exactly as before and nothing is loaded.
- **BR-M2 Load before start.** `ChallengeGate` loads today's challenge and builds the game only when the
  content is for this game and the param's day, with the challenge difficulty. Anything else goes to
  `/?challengeFailed=1` (the app hub) before any start.
- **BR-M3 Start failure.** A rate-limit error shows the limit screen; any other failure blocks with
  `BlockReason.challengeFailed`, which goes to `/?challengeFailed=1`. A challenge round never falls back to
  offline play. An accepted start is playable even with `canPlay: false` (as quest rule R1).
- **BR-M4 Same content on Play again.** Restart replays the served content and starts again with the day
  (best attempt counts on the server).
- **BR-M5 Language.** Word Puzzle and Hangman use the base code of the app locale, fallback `en`.
- **BR-M6 Code-a-Bot parity.** Content carries level numbers only, so the app's medium levels are pinned to
  the web's by `test/games/code_a_bot_parity_test.dart`.

## Security notes

- Content is produced server-side from the day; a client cannot choose it (SECURITY-13). The server
  still trusts client-reported metrics within the totals check (SECURITY-11 limit, unchanged).
- The web parses `settings` and `content` with `JSON.parse` inside a try; malformed or mismatched
  content is treated as "no challenge" (SECURITY-05, SECURITY-15).
