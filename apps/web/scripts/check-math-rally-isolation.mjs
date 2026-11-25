#!/usr/bin/env node
/**
 * I-1: a production build of apps/web contains no Phaser and no Math Rally slice code (MR1).
 *   node scripts/check-math-rally-isolation.mjs [buildDir=dist]
 * Exit 1 when a marker is found.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const dir = process.argv[2] ?? 'dist';
const MARKERS = [
  ['Phaser texture key', '__MISSING'],
  ['Phaser loader scheme', 'capacitor://'],
  ['Phaser class', 'Phaser.Game'],
  ['slice route', '/dev/math-rally-slice'],
  ['slice page', 'Math Rally slice'],
  ['Math Rally scene context', 'mathRallyContext'],
];

function files(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') || p.endsWith('.html') ? [p] : [];
  });
}

let found = 0;
for (const f of files(dir)) {
  const text = readFileSync(f, 'utf8');
  for (const [what, marker] of MARKERS) {
    if (text.includes(marker)) {
      console.error(`FOUND ${what} ("${marker}") in ${f}`);
      found++;
    }
  }
}
if (found) {
  console.error(`Math Rally isolation check FAILED: ${found} marker(s) in ${dir}`);
  process.exit(1);
}
console.log(`Math Rally isolation check passed: no Phaser or slice code in ${dir} (${files(dir).length} files)`);
