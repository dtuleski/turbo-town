#!/usr/bin/env node
// Skeleton for exporting golden fixtures from the TypeScript game logic so Dart ports
// can be tested against the same inputs and outputs (used by later features).
//
// Usage (from apps/mobile):  npx tsx tools/export_fixtures.mjs
// `tsx` is not installed in this repo; `npx` fetches it on demand. Alternative: bundle the
// TS module with esbuild (already used for the Lambda builds) and import the output.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'test', 'fixtures');

/**
 * Each entry maps a file name to an async function returning JSON-serializable data.
 * Add entries by importing from ../../web/src/utils/* or ../../../packages/shared/src/*.
 */
const fixtures = {
  // 'memory_cards.json': async () => (await import('../../web/src/utils/memoryCards.ts')).buildFixture(),
};

mkdirSync(outDir, { recursive: true });
for (const [name, build] of Object.entries(fixtures)) {
  const data = await build();
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2) + '\n');
  console.log('wrote', name);
}
if (Object.keys(fixtures).length === 0) console.log('No fixtures registered yet.');
