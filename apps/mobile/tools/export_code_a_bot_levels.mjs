#!/usr/bin/env node
// Exports the web Code-a-Bot medium levels (the Daily Challenge plays them) to a
// fixture the app's parity test compares its own levels against.
//
// Usage (from apps/mobile): <path-to>/apps/web/node_modules/.bin/tsx tools/export_code_a_bot_levels.mjs
// Output (committed): test/fixtures/code_a_bot_levels.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..', '..', 'web', 'src', 'utils');
const fixtureDir = join(here, '..', 'test', 'fixtures');
mkdirSync(fixtureDir, { recursive: true });

const bot = await import(join(web, 'codeABotUtils.ts'));

const difficulty = 'medium';
const levels = [];
for (let n = 1; n <= bot.getTotalLevels(difficulty); n++) {
  const level = bot.getLevel(difficulty, n);
  levels.push({
    levelNumber: level.levelNumber,
    rows: level.rows,
    cols: level.cols,
    start: level.start,
    startDir: level.startDir,
    goal: level.goal,
    maxInstructions: level.maxInstructions,
    optimalSteps: level.optimalSteps,
    hint: level.hint ?? '',
    grid: level.grid.map((row) => row.map((cell) => cell.type)),
  });
}

const out = { source: 'apps/web/src/utils/codeABotUtils.ts', difficulty, levels };
writeFileSync(join(fixtureDir, 'code_a_bot_levels.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${levels.length} ${difficulty} levels`);
