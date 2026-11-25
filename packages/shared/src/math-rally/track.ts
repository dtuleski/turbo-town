import type { ProtocolSpec } from './protocols';
import type { MathRallyDifficulty } from './types';

export interface TrackLayout {
  questionStart: readonly number[];
  decisionLine: readonly number[];
  mergeEnd: readonly number[];
  finishLine: number;
}

/** Positions of every line of a race (MR2 FD, domain-entities Section 4). */
export function trackLayout(spec: ProtocolSpec, difficulty: MathRallyDifficulty): TrackLayout {
  const t = spec.track;
  const forks = spec.params[difficulty].forks;
  const questionStart: number[] = [];
  const decisionLine: number[] = [];
  const mergeEnd: number[] = [];
  let start = t.firstQuestionAt;
  for (let k = 0; k < forks; k++) {
    const decision = start + t.approachLength[difficulty];
    const merge = decision + t.branchLength + t.gapLength;
    questionStart.push(start);
    decisionLine.push(decision);
    mergeEnd.push(merge);
    start = merge + t.mergeToNextQuestion;
  }
  const finishLine = (mergeEnd[forks - 1] as number) + t.finishLength;
  return { questionStart, decisionLine, mergeEnd, finishLine };
}
