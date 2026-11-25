/**
 * Math Rally gate build and preview (MR1, dev tooling only).
 *
 *   npx vite build --config vite.math-rally-gate.config.ts --mode gate
 *   MR_CSP=web npx vite preview --config vite.math-rally-gate.config.ts --mode gate   (production web policy, enforced)
 *   MR_CSP=app npx vite preview --config vite.math-rally-gate.config.ts --mode gate   (app page policy: 'self' only)
 *
 * `vite preview` is used because the dev server injects an inline React refresh script.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config';

const vercel = JSON.parse(readFileSync(path.resolve(__dirname, 'vercel.json'), 'utf8')) as {
  headers: { headers: { key: string; value: string }[] }[];
};
const webPolicy =
  vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value ?? '';

/** App page policy of G16: 'self' for every source, no data:, no blob:, no inline styles. */
export const APP_PAGE_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

const which = process.env.MR_CSP ?? 'app';
const policy = which === 'web' ? webPolicy : APP_PAGE_POLICY;

export default mergeConfig(
  base,
  defineConfig({
    build: { outDir: 'dist-gate', emptyOutDir: true },
    server: { open: false },
    preview: { port: 4173, open: false, headers: { 'Content-Security-Policy': policy } },
  })
);
