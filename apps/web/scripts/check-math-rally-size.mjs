#!/usr/bin/env node
/**
 * Size budgets S-1 to S-3 (MR1 NFR requirements):
 *   S-1 Math Rally chunks <= 450 KB gzip (level 9)
 *   S-2 first-race assets (public/games/math-rally) <= 1.5 MB
 *   S-3 entry chunk growth against a baseline build of main <= 2 KB gzip
 *
 *   node scripts/check-math-rally-size.mjs --build dist-gate [--prod dist] [--baseline /path/to/main/dist]
 * Exit 1 above a budget.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const build = args.build ?? 'dist-gate';
const KB = 1024;
const gz = (buf) => gzipSync(buf, { level: 9 }).length;

function files(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

/** The entry chunk is the module script that index.html loads. */
function entryChunk(dir) {
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const m = /<script[^>]+type="module"[^>]+src="\/?([^"]+)"/.exec(html);
  if (!m) throw new Error(`no module script in ${dir}/index.html`);
  return join(dir, m[1]);
}

const MR_MARKERS = ['mathRallyContext', '__MISSING'];
const js = files(join(build, 'assets')).filter((f) => f.endsWith('.js'));
const entry = entryChunk(build);
const mrChunks = js.filter((f) => f !== entry && MR_MARKERS.some((m) => readFileSync(f, 'utf8').includes(m)));
const s1 = mrChunks.reduce((sum, f) => sum + gz(readFileSync(f)), 0);
const assets = files(join('public', 'games', 'math-rally')).filter((f) => !f.endsWith('CREDITS.json'));
const s2 = assets.reduce((sum, f) => sum + statSync(f).size, 0);

const rows = [
  ['S-1 Math Rally chunks (gzip)', s1, 450 * KB, mrChunks.map((f) => f.split('/').pop()).join(', ')],
  ['S-2 first-race assets', s2, 1536 * KB, `${assets.length} files`],
];

if (args.baseline) {
  const prodEntry = entryChunk(args.prod ?? 'dist');
  const baseEntry = entryChunk(args.baseline);
  const growth = gz(readFileSync(prodEntry)) - gz(readFileSync(baseEntry));
  rows.push(['S-3 entry chunk growth vs main (gzip)', growth, 2 * KB, `${prodEntry.split('/').pop()} vs ${baseEntry.split('/').pop()}`]);
}

let failed = false;
console.log('| Budget | Measured | Limit | Pass | Notes |');
console.log('|---|---|---|---|---|');
for (const [name, value, limit, note] of rows) {
  const pass = value <= limit;
  failed ||= !pass;
  console.log(`| ${name} | ${(value / KB).toFixed(1)} KB | ${(limit / KB).toFixed(0)} KB | ${pass ? 'yes' : 'NO'} | ${note} |`);
}
if (!args.baseline) console.log('| S-3 | not measured (pass --baseline) | 2 KB | - | |');
process.exit(failed ? 1 : 0);
