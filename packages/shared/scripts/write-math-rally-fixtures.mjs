#!/usr/bin/env node
/**
 * Writes the Math Rally protocol golden fixtures from the built package (run `npm run build` first).
 *
 *   node scripts/write-math-rally-fixtures.mjs [version]     (default version 1)
 *
 * Refuses to overwrite a fixture whose top-level "frozen" field is true (set by pre-launch check PL8).
 */
import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
const distEntry = join(root, 'dist', 'math-rally', 'index.js');
if (!existsSync(distEntry)) {
  console.error(`Missing ${distEntry}. Run "npm run build" first.`);
  process.exit(1);
}
const mr = require(distEntry);

const version = Number(process.argv[2] ?? 1);
const spec = mr.protocolSpec(version);
if (!spec) {
  console.error(`Protocol ${version} is not registered.`);
  process.exit(1);
}

const outDir = join(root, 'src', 'math-rally', '__fixtures__');
mkdirSync(outDir, { recursive: true });

const pending = [];
function writeFixture(name, body) {
  pending.push({ name, body });
}

const difficulties = [1, 2, 3, 4];

const races = {};
for (const d of difficulties) {
  races[d] = [];
  for (let seed = 1; seed <= 25; seed++) races[d].push({ seed, race: mr.buildRace(seed, d, version) });
}
writeFixture(`protocol-v${version}-races.json`, { races });

const times = {};
for (const d of difficulties) {
  const forks = spec.params[d].forks;
  const patterns = {
    allRight: Array.from({ length: forks }, () => true),
    allWrong: Array.from({ length: forks }, () => false),
    alternateRightFirst: Array.from({ length: forks }, (_, i) => i % 2 === 0),
    alternateWrongFirst: Array.from({ length: forks }, (_, i) => i % 2 === 1),
  };
  times[d] = {};
  for (const [name, correct] of Object.entries(patterns)) {
    times[d][name] = { correct, expected: mr.expectedRaceTimesMs(version, d, correct) };
  }
}
writeFixture(`protocol-v${version}-times.json`, { times });

// Refuse before writing anything if any target fixture is frozen.
for (const { name } of pending) {
  const file = join(outDir, name);
  if (existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).frozen === true) {
    console.error(`${name} is frozen. A behaviour change must ship as a new protocol version.`);
    process.exit(2);
  }
}
for (const { name, body } of pending) {
  const json = JSON.stringify({ frozen: false, protocolVersion: version, ...body }, null, 2);
  writeFileSync(join(outDir, name), json + '\n');
  console.log(`wrote ${name}`);
}
