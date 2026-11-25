# Math Rally - Personas

**Created**: 2026-11-25
**Stage**: INCEPTION - User Stories (standard depth)
**Basis**: `../requirements/math-kart-requirements.md` Section 1. Ids use the `MKP` prefix so they do not collide with Circuit Builder (`P1` to `P5`) or Quest Map (`QP1` to `QP3`).
**Revision**: iteration 2 (design review findings 1 and 7): MKP2 note on ties at the ceiling; MKP3 privacy wording scoped to what Math Rally adds.

---

## MKP1 - Benji, the Young Racer

- **Age**: 8 to 10. **Device**: a parent's phone in the DashDen app, sometimes a tablet browser. Plays in portrait with one thumb. **Tier**: FREE (3 plays a day, difficulty 1 to 3).
- **Goal**: Drive fast, pick the right road, collect coins, beat his last score.
- **Pain points**: Small text he cannot read in time; controls that need two hands; being punished so hard for a mistake that the race stops being fun; losing a play because the game would not load.
- **Demands of the product**: Big question and signs (NFR-MK-6), one-thumb joystick (FR-MK-21), forgiving wrong-answer feedback that still shows the right answer (FR-MK-11), Easy and Medium content he knows (FR-MK-13), no play used up on a failed load (FR-MK-25).
- **Note**: Benji is also the name of the game's fictional driver. The persona describes the target player, not the real child; no detail about the real child goes into the product (NFR-MK-19).

## MKP2 - Sofia, the Older Student

- **Age**: 12 to 16. **Device**: a laptop keyboard at home, her phone on the go. **Tier**: FREE now; would consider paid for Super Hard.
- **Goal**: Clear Hard and Super Hard with no mistakes and top the leaderboard.
- **Pain points**: Questions that are too easy for her age; a leaderboard full of impossible scores; input lag that costs her a fork.
- **Demands of the product**: Harder content with fractions, percentages, negatives and equations (FR-MK-13), fast keyboard lanes (FR-MK-20, NFR-MK-2), a server-decided score others cannot fake (FR-MK-26 to FR-MK-32), her results in History and on the leaderboard (FR-MK-33, FR-MK-38).
- **Note**: the score counts correct answers only, so her perfect Super Hard race scores 8000 like every other perfect Super Hard race; the top of the board can be a tie (Q17, R17).

## MKP3 - Ana, the Parent

- **Role**: Holds the account or the subscription; watches the child play now and then.
- **Goal**: A game that teaches real math, is safe, and does not surprise her with costs or ads.
- **Pain points**: Games that collect data about children, show ads or copy other brands; a free game that later disappears behind a paywall without explanation.
- **Demands of the product**: No new data about the child, no ads, and no third-party request added by Math Rally (in the app the game talks to nothing outside the app; on the website it adds nothing to the requests every dashden.app page already makes, NFR-MK-19); original art, no borrowed characters (NFR-MK-20); calm mode for motion sensitivity (NFR-MK-7); Easy staying free if the game becomes paid, with the existing upgrade path for the other levels (FR-MK-54 to FR-MK-56).

## MKP4 - The Owner-Operator

- **Role**: Builds and runs DashDen; deploys the Game Service, Leaderboard, web and app; seeds production data; decides tiers and names.
- **Goal**: Ship a game that feels great on a phone without slowing the rest of dashden.app, and be able to make it paid later with a small, safe change.
- **Pain points**: Registry drift that hides a game or drops leaderboard events silently; a heavy bundle on every page; iOS checks only possible on his Mac.
- **Demands of the product**: A performance gate before integration work (NFR-MK-1), lazy loading (FR-MK-41), a registry consistency test and safe seed scripts (FR-MK-37, FR-MK-39), a paid-switch checklist (FR-MK-54).

---

## Persona-to-Group Coverage

| Persona | A. Discover | B. Race | C. Content | D. In the app | E. Accessibility | F. Fairness and safety | G. Operations |
|---|---|---|---|---|---|---|---|
| MKP1 Benji | Yes | Yes | Yes | Yes | Yes | No | Yes (Easy stays free) |
| MKP2 Sofia | Yes | Yes | Yes | No | No | Yes (fair score) | Yes (leaderboard) |
| MKP3 Ana | Yes | Yes (wrong-answer learning) | Yes | No | Yes | Yes (child safety) | Yes (light site, paid switch) |
| MKP4 Owner | No | No | Yes (distractor check) | Yes | No | Yes | Yes |

**Text note:** Benji, the young racer, appears in discovery, racing, content, the app and accessibility stories, and in the "Easy stays free" story (MK-28). Sofia, the older student, appears in discovery, racing and content, plus fair scoring and the leaderboard. Ana, the parent, appears in discovery, the wrong-answer story, content, accessibility, child safety, site weight, the paid switch and Easy staying free. The owner-operator appears in the distractor check, the app embedding, the fairness and safety checks, and operations. The table matches the persona lists on each story in `math-kart-stories.md`.
