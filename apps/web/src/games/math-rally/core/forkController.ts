import type { MathRallyQuestion, MathRallyRacePayload } from './shared';

export interface ForkOutcome {
  fork: number;
  choice: number;
  correct: boolean;
  atMs: number;
}

/** Fork controller (G6): records one choice and time per fork. */
export interface ForkController {
  current(): { fork: number; question: MathRallyQuestion } | null;
  onDecisionLine(lane: number, atMs: number): ForkOutcome;
  coins(): number;
  done(): boolean;
  /** Only after the last fork. */
  submission(): { choices: number[]; forkTimesMs: number[] };
}

export function createForkController(race: MathRallyRacePayload): ForkController {
  const choices: number[] = [];
  const times: number[] = [];
  let coins = 0;
  return {
    current() {
      const k = choices.length;
      const q = race.questions[k];
      return q ? { fork: k, question: q } : null;
    },
    onDecisionLine(lane, atMs) {
      const k = choices.length;
      const q = race.questions[k];
      if (!q) throw new Error('no fork left');
      const choice = Math.min(Math.max(Math.round(lane), 0), race.paths - 1);
      const correct = choice === q.correctIndex;
      choices.push(choice);
      times.push(Math.max(atMs, times[times.length - 1] ?? 0));
      if (correct) coins++;
      return { fork: k, choice, correct, atMs };
    },
    coins: () => coins,
    done: () => choices.length === race.forks,
    submission() {
      if (choices.length !== race.forks) throw new Error('race not finished');
      return { choices: [...choices], forkTimesMs: [...times] };
    },
  };
}
