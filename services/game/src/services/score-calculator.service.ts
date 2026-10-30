import type { LevelDefinition } from '@memory-game/shared';
import {
  CB_BASE_SCORE,
  CB_DEFAULT_TARGET_TIME,
  CB_MAX_FAULT_PENALTY,
  CB_MAX_HISTORICAL_FAULT_PENALTY,
  CB_MIN_USEFUL_ELEMENTS,
  CB_PER_FAULT_PENALTY,
  CB_PER_UNRESOLVED_FAULT_PENALTY,
  CB_SCORE_CAP,
  CB_SPEED_BONUS_MAX,
  CB_SPEED_BONUS_MIN,
  CB_TARGET_TIME_BY_DIFFICULTY,
  CB_TIME_WEIGHT,
} from '../utils/circuit-builder';
import type { VerifiedCircuitMetrics } from './circuit-reevaluation.service';

export interface ScoreBreakdown {
  baseScore: number;
  difficultyMultiplier: number;
  speedBonus: number;
  accuracyBonus: number;
  finalScore: number;
  difficulty: string;
  completionTime: number;
  accuracy: number;
}

/**
 * Score Calculator Service
 * Implements deterministic score calculation formula
 * Formula: 1000 × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
 * (Matches leaderboard service scoring)
 */

export class ScoreCalculatorService {
  private readonly BASE_SCORE = 1000;
  private readonly MAX_TIME = 600; // seconds (10 minutes — generous for longer games like Sudoku)
  private readonly MIN_SPEED_BONUS = 0.1; // floor so completing a game always gives some score

  /**
   * Calculate score for completed game
   * Formula: BaseScore × Difficulty Multiplier × Speed Bonus × Accuracy Bonus
   */
  calculateScore(difficulty: number, completionTime: number, attempts: number, gameThemeId?: string): number {
    return this.calculateScoreBreakdown(difficulty, completionTime, attempts, undefined, gameThemeId).finalScore;
  }

  /**
   * Calculate full score breakdown for completed game
   */
  calculateScoreBreakdown(
    difficulty: number,
    completionTime: number,
    attempts: number,
    accuracyOverride?: number,
    gameThemeId?: string
  ): ScoreBreakdown {
    const pairs = this.getPairsForDifficulty(difficulty);
    // minAttempts = theoretical perfect (one match per attempt)
    // For accuracy, we use a "grace zone" — attempts beyond minAttempts get penalized gradually
    // Formula: accuracy = max(0, 1 - (attempts - minAttempts) / graceAttempts)
    // Easy (6 pairs): 0% at 24 attempts, 50% at 15 attempts
    // Medium (8 pairs): 0% at 32 attempts, 50% at 20 attempts
    // Hard (10 pairs): 0% at 40 attempts, 50% at 25 attempts
    // Super Hard (15 pairs): 0% at 75 attempts, 50% at 45 attempts
    // Super Hard gets a bigger grace zone because 30 cards means much more discovery needed
    const minAttempts = pairs;
    const graceAttempts = difficulty >= 4 ? pairs * 4 : pairs * 3;

    // Premium games get higher base score to reach 8,000 max
    const PREMIUM_GAME_THEMES = ['SCRATCH_CODING', 'SPACE_ENTRY', 'BOND_AND_BURN', 'TRAFFIC_LAB', 'MINI_GOLF', 'LANGUAGE_PRONUNCIATION'];
    const isPremium = gameThemeId ? PREMIUM_GAME_THEMES.includes(gameThemeId) : false;
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    
    // Time targets vary by game type
    // Bond & Burn: very tight targets since it's a fast-paced picking game
    // Other premium: moderate targets
    // Standard: generous 600s window
    let maxTime: number;
    let speedBonusCap = 2.0; // default cap
    if (gameThemeId === 'BOND_AND_BURN') {
      maxTime = difficulty >= 3 ? 30 : difficulty >= 2 ? 45 : 60;
      speedBonusCap = 1.3; // cap speed bonus for this fast game
    } else if (gameThemeId === 'TRAFFIC_LAB') {
      maxTime = difficulty >= 3 ? 120 : difficulty >= 2 ? 90 : 60;
      speedBonusCap = 1.3;
    } else if (gameThemeId === 'MINI_GOLF') {
      // Tight time targets: speed bonus varies significantly within realistic play range
      // Easy: 3 holes, expect 30-90s; Medium: 4 holes, expect 40-120s; Hard: 3 holes, expect 40-150s
      maxTime = difficulty >= 3 ? 60 : difficulty >= 2 ? 50 : 40;
      speedBonusCap = 1.5; // still capped but now much harder to max out
    } else if (gameThemeId === 'LANGUAGE_LEARNING') {
      // ~20 questions, target ~4-5s per question
      // Easy: 60s, Medium: 75s, Hard: 90s
      // Finishing at maxTime = 1.0x speed, faster = bonus up to 2.0x
      maxTime = difficulty >= 3 ? 90 : difficulty >= 2 ? 75 : 60;
    } else if (gameThemeId === 'LANGUAGE_PRONUNCIATION') {
      // Pronunciation mode: fewer words (5/8/12), longer per word due to speaking + retries
      // Easy: 45s, Medium: 60s, Hard: 90s
      maxTime = difficulty >= 3 ? 90 : difficulty >= 2 ? 60 : 45;
    } else if (gameThemeId === 'SCRATCH_CODING') {
      // 5 levels of block programming — expect 1-4 min easy, 2-5 min medium, 3-6 min hard
      maxTime = difficulty >= 3 ? 240 : difficulty >= 2 ? 180 : 120;
    } else if (isPremium) {
      maxTime = difficulty >= 3 ? 90 : difficulty >= 2 ? 120 : 180;
    } else {
      maxTime = this.MAX_TIME;
    }

    // Base score varies by game type
    let baseScore: number;
    if (gameThemeId === 'MINI_GOLF') {
      baseScore = 1800; // Produces Easy ~4000, Medium ~6000, Hard ~8000 for perfect games
    } else if (gameThemeId === 'SCRATCH_CODING') {
      baseScore = 1700; // Block programming game
    } else if (isPremium) {
      baseScore = 1700;
    } else if (difficulty >= 4) {
      baseScore = 1100; // Super Hard Memory Match: 1100 × 2.5 × 2.0 × 1.5 = 8,250 → capped to 8,000
    } else {
      baseScore = this.BASE_SCORE;
    }
    const speedBonus = Math.min(speedBonusCap, Math.max(this.MIN_SPEED_BONUS, 1 + (maxTime - completionTime) / maxTime));

    let accuracyRatio: number;
    if (accuracyOverride !== undefined) {
      accuracyRatio = accuracyOverride;
    } else {
      accuracyRatio = Math.max(0, 1 - (attempts - minAttempts) / graceAttempts);
    }
    const accuracyBonus = 0.5 + accuracyRatio * 1.0;

    let finalScore = baseScore * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) {
      finalScore = 0;
    }
    // Cap by difficulty: Easy 5000, Medium 6500, Hard+ 8000
    const maxScoreByDifficulty = difficulty <= 1 ? 5000 : difficulty <= 2 ? 6500 : 8000;
    finalScore = Math.min(maxScoreByDifficulty, Math.max(0, Math.round(finalScore)));

    const diffLabel = difficulty <= 1 ? 'Easy' : difficulty <= 2 ? 'Medium' : 'Hard';

    return {
      baseScore,
      difficultyMultiplier,
      speedBonus,
      accuracyBonus,
      finalScore,
      difficulty: diffLabel,
      completionTime,
      accuracy: accuracyRatio,
    };
  }

  /**
   * Calculate the score breakdown for a Circuit Builder submission (E3).
   *
   * Three verified factors, in order of leverage:
   *   - component efficiency: fewer components out of the level's budget scores higher
   *   - fault avoidance: two separately-capped penalties, one per fault signal, summed after
   *     netting and capped overall at CB_MAX_FAULT_PENALTY - see below
   *   - completion time: weighted MODESTLY at CB_TIME_WEIGHT (FR-CB-25), so an elegant
   *     fault-free circuit out-scores a faster careless one
   *
   * Only server-verified metrics are read. `totalCurrent` and `totalResistance` from the
   * engine result are deliberately NOT used: the engine documents them as describing the
   * dominant source only, so they understate a multi-source circuit.
   *
   * Returns the unchanged ScoreBreakdown shape, so apps/web's ScoreBreakdownModal needs no
   * change. For this game `accuracy` carries the verified circuit-quality ratio, which that
   * modal renders under the label "Accuracy"; relabelling the UI is frontend scope and the
   * shape is fixed by contract.
   */
  calculateCircuitBuilderBreakdown(
    metrics: VerifiedCircuitMetrics,
    level: LevelDefinition,
    difficulty: number
  ): ScoreBreakdown {
    const targetTime = CB_TARGET_TIME_BY_DIFFICULTY[difficulty] ?? CB_DEFAULT_TARGET_TIME;
    const speedBonus = clampRange(
      1 + (CB_TIME_WEIGHT * (targetTime - metrics.completionTime)) / targetTime,
      CB_SPEED_BONUS_MIN,
      CB_SPEED_BONUS_MAX
    );

    // Budget is the level's own component allowance, plus whatever the level pre-placed. A
    // pre-placed element arrives back in the submitted layout and E2 grants it allowance, so
    // counting it here keeps the two halves of the level contract consistent. Both authored
    // levels pre-place nothing, so this is 7 on cb-01-closed-circuit either way. The
    // denominator subtracts the irreducible minimum (one source, one load) so using exactly
    // the minimum scores 1.0.
    const budget =
      Object.values(level.availableComponents).reduce((total, count) => total + (count ?? 0), 0) +
      level.prePlaced.length;
    const denominator = Math.max(1, budget - CB_MIN_USEFUL_ELEMENTS);
    const efficiencyRatio = clampRange((budget - metrics.componentCount) / denominator, 0, 1);

    // Two fault signals, priced separately and then SUMMED after netting:
    //
    //   - historical: the client's own count of faults it hit during play, clamped by E2.
    //     Unverifiable in the under-reporting direction, so weighted gently.
    //   - verified: what the ENGINE still finds in the submitted final layout. Fully
    //     server-computed, so weighted hard - this is what stops an unprotected LED from
    //     out-scoring the canonical protected solve (FR-CB-2, CB-3.6).
    //
    // A fault still present at submission necessarily also occurred during the attempt, so
    // it is already inside whatever the client reported. Netting it out of the cleared count
    // before pricing means no fault is charged twice and reporting a fault honestly costs
    // exactly what hiding it costs.
    //
    // The two terms then ADD rather than one replacing the other. Taking their maximum made
    // the verified penalty merely substitute for the historical one, so the MARGINAL cost of
    // leaving a fault in the submitted layout shrank as the reported count rose and reached
    // zero at a reported count of 6 - which reopened the exploit for exactly the player who
    // experiments most. Summing keeps that marginal cost flat at 0.25.
    //
    // Each term is capped on its own, not only in total, so a saturated historical penalty
    // can never consume the room the verified penalty needs under CB_MAX_FAULT_PENALTY.
    const clearedFaultCount = Math.max(0, metrics.faultCount - metrics.unresolvedFaultCount);
    const historicalPenalty = Math.min(
      CB_MAX_HISTORICAL_FAULT_PENALTY,
      clearedFaultCount * CB_PER_FAULT_PENALTY
    );
    const verifiedPenalty = metrics.unresolvedFaultCount * CB_PER_UNRESOLVED_FAULT_PENALTY;
    const faultPenalty = Math.min(CB_MAX_FAULT_PENALTY, historicalPenalty + verifiedPenalty);
    const qualityRatio = clampRange(efficiencyRatio - faultPenalty, 0, 1);

    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    const accuracyBonus = 0.5 + qualityRatio;

    let finalScore = CB_BASE_SCORE * difficultyMultiplier * speedBonus * accuracyBonus;
    if (isNaN(finalScore) || !isFinite(finalScore)) {
      finalScore = 0;
    }
    finalScore = Math.min(CB_SCORE_CAP, Math.max(0, Math.round(finalScore)));

    const diffLabel = difficulty <= 1 ? 'Easy' : difficulty <= 2 ? 'Medium' : 'Hard';

    return {
      baseScore: CB_BASE_SCORE,
      difficultyMultiplier,
      speedBonus,
      accuracyBonus,
      finalScore,
      difficulty: diffLabel,
      completionTime: metrics.completionTime,
      accuracy: qualityRatio,
    };
  }

  /**
   * Get difficulty multiplier
   * Maps: 1 = EASY (1.0x), 2 = MEDIUM (1.5x), 3 = HARD (2.0x), 4 = SUPER_HARD (2.5x)
   */
  private getDifficultyMultiplier(difficulty: number): number {
    if (difficulty <= 1) {
      return 1.0; // EASY
    } else if (difficulty <= 2) {
      return 1.5; // MEDIUM
    } else if (difficulty <= 3) {
      return 2.0; // HARD
    } else {
      return 2.5; // SUPER_HARD
    }
  }

  /**
   * Get number of pairs for difficulty level
   * Memory Match sends: EASY=1 (6 pairs), MEDIUM=2 (8 pairs), HARD=3 (10 pairs), SUPER_HARD=4 (15 pairs)
   */
  private getPairsForDifficulty(difficulty: number): number {
    switch (difficulty) {
      case 1:
        return 6;
      case 2:
        return 8;
      case 3:
        return 10;
      case 4:
        return 15;
      default:
        return 8;
    }
  }
}

/** Confine a value to [low, high]. A non-finite input resolves to `low`. */
function clampRange(value: number, low: number, high: number): number {
  if (!isFinite(value)) {
    return low;
  }
  return Math.min(high, Math.max(low, value));
}
