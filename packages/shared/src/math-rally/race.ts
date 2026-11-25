import { protocolSpec } from './protocols';
import { createRng } from './rng';
import type { MathRallyDifficulty, MathRallyQuestion, MathRallyRace } from './types';

export const MAX_QUESTION_DRAWS = 64;
export const MAX_SAME_POSITION_RUN = 3;

export function promptKey(q: { kind: string; operands: readonly number[] }): string {
  return `${q.kind}:${q.operands.join(',')}`;
}

/**
 * Builds a whole race from (seed, difficulty, version): pure and deterministic (FR-MK-18).
 * Throws RangeError for an unregistered version (callers check MR_SUPPORTED_PROTOCOLS first).
 */
export function buildRace(seed: number, difficulty: MathRallyDifficulty, version: number): MathRallyRace {
  const spec = protocolSpec(version);
  if (!spec) throw new RangeError(`Math Rally protocol ${version} is not registered`);
  const params = spec.params[difficulty];
  if (!params) throw new RangeError(`Math Rally difficulty ${difficulty} is not valid`);
  const rng = createRng(seed);
  const kinds = spec.kinds[difficulty].map((k) => ({ value: k.kind, weight: k.weight }));
  const used = new Set<string>();
  const positions: number[] = [];
  const questions: MathRallyQuestion[] = [];

  for (let k = 0; k < params.forks; k++) {
    let generated = null;
    for (let i = 0; i < MAX_QUESTION_DRAWS; i++) {
      const q = spec.generateQuestion(rng, difficulty, rng.weightedPick(kinds));
      if (!used.has(promptKey(q))) {
        generated = q;
        break;
      }
    }
    if (!generated) {
      throw new Error(`Math Rally: no new question in ${MAX_QUESTION_DRAWS} draws (seed ${seed}, difficulty ${difficulty})`);
    }
    used.add(promptKey(generated));

    const [correct, ...distractors] = spec.buildOptions(rng, generated, difficulty, params.paths);

    let position = rng.nextInt(0, params.paths - 1);
    const recent = positions.slice(-MAX_SAME_POSITION_RUN);
    if (recent.length === MAX_SAME_POSITION_RUN && recent.every((p) => p === position)) {
      const others = Array.from({ length: params.paths }, (_, i) => i).filter((i) => i !== position);
      position = rng.pick(others);
    }
    positions.push(position);

    const options: string[] = [];
    let next = 0;
    for (let i = 0; i < params.paths; i++) {
      options.push(i === position ? (correct as string) : (distractors[next++] as string));
    }
    questions.push({ kind: generated.kind, operands: generated.operands, options, correctIndex: position });
  }

  return {
    payload: {
      protocolVersion: version,
      difficulty,
      forks: params.forks,
      paths: params.paths,
      readSeconds: params.readSeconds,
      questions,
    },
    record: {
      seed: seed >>> 0,
      protocolVersion: version,
      paths: params.paths,
      forks: params.forks,
      key: questions.map((q) => q.correctIndex),
    },
  };
}
