# MR3 Backend - Functional Design Plan

**Unit**: MR3 Backend (`services/game`, `services/leaderboard`, `scripts/`), depth Minimal
**Settles** (execution plan): the seed script's `displayOrder`, and the completion sequence checked against the Circuit Builder exit. Score constants and the two refusal texts are fixed by the inception design.

## Facts found (read-only scan of `memory-game-catalog-prod`, account 342278407349)

Display orders today: 1 memory-match, 2 math-challenge, 3 word-puzzle, ..., 16 scratch-coding and math-maze (both 16), 17 pattern-recall, 18 space-entry, 20 bond-and-burn, 21 traffic-lab (COMING_SOON), 22 mini-golf, 23 circuit-builder. The highest is 23.

## Plan

- [x] 1. Answer the question below (owner): A, displayOrder 24
- [ ] 2. Read the Circuit Builder start and completion paths in `services/game/src/services/game.service.ts` and write the Math Rally completion sequence step by step against it
- [ ] 3. Write `construction/math-rally-backend/functional-design/business-rules.md` (validation order, refusal points, score constants, seed values)
- [ ] 4. Write `construction/math-rally-backend/functional-design/business-logic-model.md` (start and complete flows)
- [ ] 5. Write `construction/math-rally-backend/functional-design/domain-entities.md` (game record fields, seed rows)
- [ ] 6. Present for approval

## Question 1
Where does Math Rally appear in the game list (the catalog's `displayOrder`)?

A) 24: after Circuit Builder, at the end, like every recent game; no other row changes (Recommended)
B) 2.5: right after Math Challenge near the top, without renumbering other games (only if the web and app sort non-integer orders correctly, checked first)
C) 1: first in the list, and every other game moves down by one (changes 23 rows)
X) Other (please describe after [Answer]: tag below)

[Answer]: A (owner: "I accept all your recommendations")
