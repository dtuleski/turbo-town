#!/usr/bin/env node
/**
 * Builds the Math Rally embed bundle for the app (T1, spike level).
 *   node scripts/build-math-rally-embed.mjs [--gate] [--drop-white] [--out <dir>]
 * --gate        include the dev overlay and fault trigger (never for a release)
 * --drop-white  remove sys/white.png after the build (U20 test only)
 * Checks: no inline <script>, <style> or style= in index.html; sys/ textures present (unless dropped);
 * writes build-info.json with the protocol version and a source hash.
 */
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const args = process.argv.slice(2);
const gate = args.includes('--gate');
const dropWhite = args.includes('--drop-white');
const outIdx = args.indexOf('--out');
const out = resolve(outIdx >= 0 ? args[outIdx + 1] : 'dist-embed');
const known = new Set(['--gate', '--drop-white', '--out']);
for (const [i, a] of args.entries()) {
  if (a.startsWith('--') && !known.has(a)) {
    console.error(`unknown argument ${a}`);
    process.exit(2);
  }
  if (!a.startsWith('--') && args[i - 1] !== '--out') {
    console.error(`unknown argument ${a}`);
    process.exit(2);
  }
}

function files(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
const srcFiles = files('src/games/math-rally').filter((f) => !f.includes('.test.')).sort();
const hash = createHash('sha256');
for (const f of [...srcFiles, ...files('public/games/math-rally').sort()]) hash.update(f).update(readFileSync(f));
const sourceHash = hash.digest('hex');
const buildId = `app-${sourceHash.slice(0, 12)}`;

execFileSync('npx', ['vite', 'build', '--config', 'vite.math-rally-embed.config.ts', '--mode', gate ? 'gate' : 'production'], {
  stdio: 'inherit',
  env: { ...process.env, MR_EMBED_OUT: out, VITE_MR_BUILD_ID: buildId },
});

const html = readFileSync(join(out, 'index.html'), 'utf8');
const problems = [];
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) problems.push('inline <script>');
if (/<style[\s>]/i.test(html)) problems.push('<style> element');
if (/\sstyle=/i.test(html)) problems.push('style= attribute');
for (const t of ['default', 'missing', 'white']) {
  if (!existsSync(join(out, 'sys', `${t}.png`))) problems.push(`missing sys/${t}.png`);
}
if (problems.length) {
  console.error(`embed build check FAILED: ${problems.join(', ')}`);
  process.exit(1);
}
if (dropWhite) rmSync(join(out, 'sys', 'white.png'));

const protocol = Number(/MR_CLIENT_PROTOCOL = (\d+)/.exec(readFileSync('../../packages/shared/src/math-rally/protocols.ts', 'utf8'))?.[1]);
writeFileSync(join(out, 'build-info.json'), JSON.stringify({ protocolVersion: protocol, buildId, sourceHash, gate, dropWhite }, null, 2) + '\n');
console.log(`embed build ok: ${out} (${buildId}${gate ? ', gate' : ''}${dropWhite ? ', white.png removed' : ''})`);
