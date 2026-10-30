/**
 * Circuit Builder - constants owned by the Game Service (unit U6).
 *
 * Every numeric bound that describes a *circuit* lives in the engine
 * (`packages/shared/src/circuit/constants.ts`) and is imported from
 * `@memory-game/shared` at the point of use. Nothing from there is copied here: one source of
 * truth, so the browser and the server cannot drift.
 *
 * What lives here is only what the engine has no opinion about - the theme id, the single
 * generic rejection message, the submission size ceiling, and the scoring weights.
 */

/** Theme id, following the uppercase-snake convention of every existing game theme. */
export const CIRCUIT_BUILDER_THEME_ID = 'CIRCUIT_BUILDER';

/**
 * The one message every Circuit Builder rejection carries, whatever the cause.
 *
 * A single string removes the disclosure oracle: a probing client learns that its submission
 * was refused and nothing about which bound it hit (NFR-CB-21, SECURITY-09, SECURITY-15).
 */
export const CIRCUIT_SUBMISSION_REJECTED_MESSAGE =
  'Circuit submission could not be verified. Rebuild the circuit and try again.';

/**
 * Maximum serialized size of the `circuitSubmission` object, in characters of
 * `JSON.stringify`.
 *
 * Derived from the engine ceilings rather than picked. Worst legal payload, with
 * maximum-length (64 character) ids throughout:
 *
 *   64 elements  x ~300 chars (id + kind + 2 terminals + position + params + punctuation)
 *                                                                        = about 19 200
 *   128 connections x ~220 chars (id + from + to + punctuation)           = about 28 160
 *   64 switch entries x ~80 chars (id + "closed")                         = about  5 000
 *   levelId, gridSize, environment, faultCount, wrapper                   = about     400
 *                                                                           ------------
 *                                                                  total  = about 52 760
 *
 * 65536 leaves roughly 24% headroom over that worst legal payload while sitting three orders
 * of magnitude below the API Gateway and Lambda request limits, so this ceiling binds first.
 */
export const MAX_CIRCUIT_SUBMISSION_CHARS = 65536;

/**
 * Upper bound on a submitted completion time, in seconds. Same ceiling the existing
 * `validateCompletionTime` already applies to every other game, restated here because E1 runs
 * before the per-difficulty floor check and needs a bound of its own.
 */
export const CB_MAX_COMPLETION_TIME = 3600;

// ---------------------------------------------------------------------------
// Scoring weights (E3) - FR-CB-24, FR-CB-25
// ---------------------------------------------------------------------------

/** Same base as the existing premium games, so Circuit Builder scores are comparable. */
export const CB_BASE_SCORE = 1700;

/** Same ceiling the generic path applies to premium games and to difficulty 4. */
export const CB_SCORE_CAP = 8000;

/**
 * Time's share of the score. Deliberately modest (FR-CB-25): it moves the result across a
 * 0.90 to 1.15 band, a 1.28x spread, while circuit quality moves it across 0.5 to 1.5, a 3x
 * spread. Design quality therefore has roughly 2.4 times the leverage of speed, and speed
 * only breaks ties between equally elegant circuits.
 */
export const CB_TIME_WEIGHT = 0.15;

export const CB_SPEED_BONUS_MIN = 0.9;
export const CB_SPEED_BONUS_MAX = 1.15;

/**
 * Reference completion time per difficulty tier, in seconds. U6's judgement, not a stated
 * requirement: these sit between the existing `SCRATCH_CODING` targets (120/180/240) and the
 * `TRAFFIC_LAB` targets (60/90/120), which bracket a comparable puzzle game. Retunable after
 * playtesting by editing this one object.
 */
export const CB_TARGET_TIME_BY_DIFFICULTY: Readonly<Record<number, number>> = Object.freeze({
  1: 90,
  2: 120,
  3: 150,
  4: 180,
});

/** Fallback when a level carries a difficulty outside the table. */
export const CB_DEFAULT_TARGET_TIME = 120;

/**
 * The irreducible minimum a working circuit needs: one source and one load. Component
 * efficiency is measured against `budget - CB_MIN_USEFUL_ELEMENTS`, so a player who uses
 * exactly the minimum scores full efficiency.
 */
export const CB_MIN_USEFUL_ELEMENTS = 2;

/**
 * Quality cost of each fault the client reports as having occurred and been cleared during
 * the attempt (FR-CB-24).
 *
 * Deliberately gentle: CB-3.8 wants a mistake that was understood and fixed to carry
 * consequence without punishing experimentation. This is also the only fault signal the
 * server cannot verify, so it is the one weighted least.
 */
export const CB_PER_FAULT_PENALTY = 0.05;

/**
 * Ceiling on the HISTORICAL half of the fault penalty, applied to that half alone.
 *
 * Capped separately from `CB_MAX_FAULT_PENALTY` so the engine-verified half always has room
 * left under the overall ceiling. A single ceiling over the summed penalty would let a large
 * reported count saturate it and make the verified term free again, which is the regime that
 * reopens the protective-resistor exploit: at a reported count of 12 both penalties would sit
 * at 0.60 and the unprotected solve would win on efficiency once more.
 *
 * Set equal to `CB_PER_UNRESOLVED_FAULT_PENALTY` so the two halves split the 0.60 ceiling
 * evenly: the unverifiable signal can never cost more than one verified fault does.
 */
export const CB_MAX_HISTORICAL_FAULT_PENALTY = 0.3;

/**
 * Quality cost of each fault the ENGINE still finds in the submitted final layout.
 *
 * Six times the historical penalty, because the two signals describe different things: a
 * fault that was fixed shows learning, while a fault still present at submission shows the
 * lesson was never learned. This value is server-verified, so it can be weighted hard.
 *
 * The magnitude is not arbitrary. It has to exceed what dropping one component buys on the
 * efficiency term, or omitting an LED's protective resistor would still out-score the
 * canonical protected solve (FR-CB-2, CB-3.6). One component is worth
 * `1 / max(1, budget - CB_MIN_USEFUL_ELEMENTS)` of `qualityRatio`, which is 0.20 on
 * `cb-01-closed-circuit`'s budget of 7.
 *
 * The figure that has to clear 0.20 is the MARGINAL cost of leaving a fault in the submitted
 * layout, not this constant on its own. Because the historical count already includes that
 * fault, the scorer nets it out of the cleared count before pricing it, so the marginal cost
 * is `0.30 - CB_PER_FAULT_PENALTY = 0.25` whenever the client also reported it and the full
 * 0.30 when it did not. 0.25 is the binding figure.
 *
 * > **Contract for U4, level authoring.** A guided level must grant a total component budget
 * > of at least **7** for the protected solve to win outright. One component is worth 0.250
 * > of the quality factor at a budget of 6, which exactly ties the 0.25 marginal cost, and
 * > more than that below 6, where an unprotected solve could win again. `cb-01-closed-circuit`
 * > grants 7.
 */
export const CB_PER_UNRESOLVED_FAULT_PENALTY = 0.3;

/**
 * Ceiling on the total fault penalty, so a score can never go negative and an absurd reported
 * fault count scores identically to a merely bad one. With the historical half capped at
 * `CB_MAX_HISTORICAL_FAULT_PENALTY`, 0.60 leaves exactly one verified fault's worth of room
 * under this ceiling, so the verified penalty is never absorbed by it. See the residual-trust
 * analysis in
 * `aidlc-docs/construction/backend-integration/functional-design/functional-design.md`.
 */
export const CB_MAX_FAULT_PENALTY = 0.6;
