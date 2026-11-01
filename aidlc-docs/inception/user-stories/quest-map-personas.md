# Quest Map v1 - Personas

**Created**: 2026-11-01
**Stage**: INCEPTION - User Stories (minimal depth)
**Basis**: `quest-map-requirements.md` Section 1. Ids use the `QP` prefix so they do not collide with the Circuit Builder `P1` to `P5` set.

---

## QP1 - Nico, the Free Kid

- **Age**: 8 to 11. Plays on a parent's tablet or a school laptop. **Tier**: FREE (3 plays a day, difficulty 1 to 3).
- **Goal**: Always know what to play next and see stars fill up.
- **Pain point**: Runs out of plays after three games and does not know why he is stopped.
- **Demands of the product**: One obvious next node, big touch targets, readable in his language, a clear "come back tomorrow" message with remaining plays (FR-QM-4, FR-QM-17, NFR-QM-2, NFR-QM-4).

## QP2 - Marco, the Paid Player

- **Age**: 12 to 16. **Tier**: LIGHT, STANDARD or PREMIUM.
- **Goal**: Clear World 2, then replay nodes for 3 stars and the Mastered badge.
- **Pain point**: Progress that can be lost, or a replay that overwrites a better result.
- **Demands of the product**: Best score and stars never decrease, boss gauntlets that are fair when interrupted, badges he can see (FR-QM-10, FR-QM-11, FR-QM-13).

## QP3 - Carolina, the Parent or Buyer

- **Role**: Holds the subscription. Sees the map over the child's shoulder or on her own account.
- **Goal**: Understand what World 2 adds before paying.
- **Pain point**: Paying for something she cannot preview, or a lock that has no explanation.
- **Demands of the product**: A visible, explained World 2 lock with a link to the subscription page; the paywall cannot be bypassed by trickery (FR-QM-6, NFR-QM-6).

---

## Persona-to-Group Coverage

| Persona | A. Discover | B. Play | C. Progress | D. Access and fairness |
|---|---|---|---|---|
| QP1 Nico | Yes | Yes | Yes | Yes (allowance) |
| QP2 Marco | Yes | Yes | Yes | Yes (removed games, QM-13) |
| QP3 Carolina | Yes | No | No | Yes (paywall) |

**Text note:** The two player personas touch every group. The buyer persona only meets discovery and the paid boundary.
