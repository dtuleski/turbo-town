import { describe, expect, it } from "vitest";
import { isCanonicalOption, parseOption, protocolSpec, sameValue } from "../core/shared";
import easy from "./slice-easy.json";
import hard from "./slice-hard.json";

describe.each([["easy", easy, 1], ["hard", hard, 3]] as const)("slice fixture %s", (_n, race, difficulty) => {
  it("matches protocol v1 parameters and option rules", () => {
    const p = protocolSpec(1)!.params[difficulty];
    expect(race.protocolVersion).toBe(1);
    expect(race.difficulty).toBe(difficulty);
    expect([race.forks, race.paths, race.readSeconds]).toEqual([p.forks, p.paths, p.readSeconds]);
    expect(race.questions).toHaveLength(p.forks);
    for (const q of race.questions) {
      expect(q.options).toHaveLength(p.paths);
      const vals = q.options.map((o) => {
        expect(isCanonicalOption(o)).toBe(true);
        return parseOption(o)!;
      });
      for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) expect(sameValue(vals[i]!, vals[j]!)).toBe(false);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(p.paths);
    }
  });
});
