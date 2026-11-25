import { readFileSync } from 'fs';
import { join } from 'path';
import { MR_SUPPORTED_PROTOCOLS } from './protocols';
import { buildRace } from './race';
import { expectedRaceTimesMs } from './timing';
import type { MathRallyDifficulty } from './types';

/**
 * Freeze rule (NFR-MK-23): for every supported version, the generator, distractors, track and
 * motion must reproduce the committed fixtures exactly. A deliberate change before launch:
 * rebuild and rerun scripts/write-math-rally-fixtures.mjs. After launch: a new protocol version.
 */

function load(name: string) {
  return JSON.parse(readFileSync(join(__dirname, '__fixtures__', name), 'utf8'));
}

describe.each(MR_SUPPORTED_PROTOCOLS.map((v) => [v]))('protocol v%i golden fixtures', (version) => {
  const races = load(`protocol-v${version}-races.json`);
  const times = load(`protocol-v${version}-times.json`);

  it('fixtures are for this version', () => {
    expect(races.protocolVersion).toBe(version);
    expect(times.protocolVersion).toBe(version);
  });

  it('buildRace reproduces every fixture race', () => {
    for (const [d, list] of Object.entries(races.races) as [string, { seed: number; race: unknown }[]][]) {
      expect(list).toHaveLength(25);
      for (const { seed, race } of list) {
        expect(buildRace(seed, Number(d) as MathRallyDifficulty, version)).toEqual(race);
      }
    }
  });

  it('expectedRaceTimesMs reproduces every fixture time', () => {
    for (const [d, patterns] of Object.entries(times.times) as [string, Record<string, { correct: boolean[]; expected: unknown }>][]) {
      expect(Object.keys(patterns)).toHaveLength(4);
      for (const { correct, expected } of Object.values(patterns)) {
        expect(expectedRaceTimesMs(version, Number(d) as MathRallyDifficulty, correct)).toEqual(expected);
      }
    }
  });
});
