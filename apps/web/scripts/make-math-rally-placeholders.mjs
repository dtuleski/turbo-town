#!/usr/bin/env node
/**
 * Generates the Math Rally slice placeholders (original work, no external files):
 *   public/games/math-rally/sys/{default,missing,white}.png   Phaser built-in textures
 *   public/games/math-rally/atlas.png + atlas.json            sprites (kart, tree, bush, post, coin, sign, flag)
 *   public/games/math-rally/sfx/{chime,buzz,beep,go}.wav      sounds
 *   public/games/math-rally/CREDITS.json                      every file listed
 * Deterministic: running it twice gives the same bytes.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'games', 'math-rally');
mkdirSync(join(root, 'sys'), { recursive: true });
mkdirSync(join(root, 'sfx'), { recursive: true });

// ---------- PNG ----------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4);
  }
  set(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = r;
    this.px[i + 1] = g;
    this.px[i + 2] = b;
    this.px[i + 3] = a;
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  circle(cx, cy, r, c) {
    for (let j = Math.floor(cy - r); j <= cy + r; j++)
      for (let i = Math.floor(cx - r); i <= cx + r; i++) if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r) this.set(i, j, c);
  }
  tri(x0, y0, x1, y1, x2, y2, c) {
    const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
        const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
        if (w0 >= 0 && w1 >= 0 && 1 - w0 - w1 >= 0) this.set(x, y, c);
      }
  }
}

const WHITE = [255, 255, 255];
// Built-in textures (Phaser 4.2.1 defaults are data: URLs; these replace them, MR1 Step 1).
{
  const c = new Canvas(4, 4);
  c.rect(0, 0, 4, 4, WHITE);
  writeFileSync(join(root, 'sys', 'white.png'), png(4, 4, c.px));
  writeFileSync(join(root, 'sys', 'default.png'), png(32, 32, new Canvas(32, 32).px));
  const m = new Canvas(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) m.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? [0, 0, 0] : [255, 0, 255]);
  writeFileSync(join(root, 'sys', 'missing.png'), png(32, 32, m.px));
}

// Atlas (256 x 192). Simple toy shapes, designed for this game; nothing copied from any existing game.
const atlas = new Canvas(256, 192);
const frames = {};
function frame(name, x, y, w, h) {
  frames[name] = { frame: { x, y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
}
// Kart from behind (96 x 72): blue body, big rear wheels, Benji's round orange helmet.
{
  const ox = 0, oy = 0;
  atlas.rect(ox + 14, oy + 34, 68, 24, [40, 110, 220]);
  atlas.rect(ox + 22, oy + 26, 52, 10, [60, 140, 240]);
  atlas.circle(ox + 48, oy + 18, 14, [250, 150, 40]);
  atlas.rect(ox + 38, oy + 14, 20, 6, [30, 30, 40]);
  atlas.rect(ox + 2, oy + 44, 18, 26, [30, 30, 35]);
  atlas.rect(ox + 76, oy + 44, 18, 26, [30, 30, 35]);
  atlas.rect(ox + 36, oy + 56, 24, 6, [250, 210, 60]);
  frame('kart', ox, oy, 96, 72);
}
// Tree (64 x 96)
{
  const ox = 96, oy = 0;
  atlas.rect(ox + 28, oy + 60, 8, 36, [120, 80, 40]);
  atlas.circle(ox + 32, oy + 36, 26, [50, 160, 70]);
  atlas.circle(ox + 22, oy + 46, 16, [60, 180, 80]);
  atlas.circle(ox + 42, oy + 46, 16, [45, 150, 65]);
  frame('tree', ox, oy, 64, 96);
}
// Bush (64 x 40)
{
  const ox = 160, oy = 0;
  atlas.circle(ox + 20, oy + 24, 16, [70, 170, 80]);
  atlas.circle(ox + 40, oy + 22, 18, [60, 160, 70]);
  frame('bush', ox, oy, 64, 40);
}
// Fence post (16 x 48), coin (32 x 32), flag (32 x 48)
atlas.rect(224, 0, 16, 48, [240, 240, 235]);
atlas.rect(224, 6, 16, 4, [200, 60, 60]);
frame('post', 224, 0, 16, 48);
atlas.circle(176, 64, 15, [250, 200, 40]);
atlas.circle(176, 64, 10, [255, 225, 90]);
frame('coin', 160, 48, 32, 32);
atlas.rect(200, 48, 4, 48, [80, 80, 80]);
for (let y = 0; y < 24; y++) for (let x = 0; x < 26; x++) atlas.set(204 + x, 48 + y, ((x >> 2) + (y >> 2)) % 2 ? [20, 20, 20] : WHITE);
frame('flag', 200, 48, 32, 48);
// Sign board (128 x 64): white board with a dark border and two posts.
{
  const ox = 0, oy = 96;
  atlas.rect(ox, oy, 128, 48, [40, 50, 60]);
  atlas.rect(ox + 4, oy + 4, 120, 40, WHITE);
  atlas.rect(ox + 20, oy + 48, 6, 16, [90, 90, 90]);
  atlas.rect(ox + 102, oy + 48, 6, 16, [90, 90, 90]);
  frame('sign', ox, oy, 128, 64);
}
// Flame puff (32 x 32) and dust puff (32 x 32)
atlas.circle(144, 112, 12, [255, 140, 30]);
atlas.circle(144, 112, 6, [255, 230, 120]);
frame('flame', 128, 96, 32, 32);
atlas.circle(176, 112, 12, [190, 170, 140, 200]);
frame('dust', 160, 96, 32, 32);
writeFileSync(join(root, 'atlas.png'), png(256, 192, atlas.px));
writeFileSync(
  join(root, 'atlas.json'),
  JSON.stringify({ frames, meta: { image: 'atlas.png', format: 'RGBA8888', size: { w: 256, h: 192 }, scale: '1' } }, null, 2) + '\n'
);

// ---------- WAV ----------
function wav(samples, rate = 22050) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767 | 0, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
function tone(parts, rate = 22050) {
  const out = [];
  for (const { f, ms, vol = 0.4, wave = 'sine' } of parts) {
    const n = Math.round((ms / 1000) * rate);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const env = Math.min(1, i / 200) * Math.exp((-3 * i) / n);
      const ph = 2 * Math.PI * f * t;
      const v = wave === 'square' ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph);
      out.push(v * vol * env);
    }
  }
  return out;
}
writeFileSync(join(root, 'sfx', 'chime.wav'), wav(tone([{ f: 880, ms: 120 }, { f: 1320, ms: 220 }])));
writeFileSync(join(root, 'sfx', 'buzz.wav'), wav(tone([{ f: 150, ms: 260, vol: 0.25, wave: 'square' }])));
writeFileSync(join(root, 'sfx', 'beep.wav'), wav(tone([{ f: 660, ms: 140 }])));
writeFileSync(join(root, 'sfx', 'go.wav'), wav(tone([{ f: 990, ms: 320 }])));

// ---------- Credits ----------
const original = (file, what) => ({
  file,
  what,
  author: 'DashDen (generated by apps/web/scripts/make-math-rally-placeholders.mjs)',
  source: 'original',
  licence: 'Original work for DashDen',
  date: '2026-11-25',
});
writeFileSync(
  join(root, 'CREDITS.json'),
  JSON.stringify(
    {
      note: 'Every Math Rally asset. Placeholders for the MR1 slice; final art and sound arrive in MR4.',
      assets: [
        original('sys/default.png', 'Phaser built-in default texture (transparent 32 x 32)'),
        original('sys/missing.png', 'Phaser built-in missing texture (32 x 32 checkerboard)'),
        original('sys/white.png', 'Phaser built-in white texture (4 x 4)'),
        original('atlas.png', 'Sprite atlas: kart, tree, bush, post, coin, flag, sign, flame, dust'),
        original('atlas.json', 'Atlas frame data'),
        original('sfx/chime.wav', 'Right-answer chime'),
        original('sfx/buzz.wav', 'Wrong-answer buzz'),
        original('sfx/beep.wav', 'Countdown beep'),
        original('sfx/go.wav', 'Countdown go'),
      ],
    },
    null,
    2
  ) + '\n'
);
console.log('Math Rally placeholders written to', root);
