/**
 * Math Rally embed build: the game as bundled files for the app's WebView (T1, spike level in MR1).
 * Built by scripts/build-math-rally-embed.mjs; do not run directly.
 */
import path from 'path';
import { defineConfig } from 'vite';

const root = path.resolve(__dirname, 'src/games/math-rally/embed');

export default defineConfig(({ mode }) => ({
  root,
  base: './',
  mode,
  publicDir: path.resolve(__dirname, 'public/games/math-rally'),
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: process.env.MR_EMBED_OUT ?? path.resolve(__dirname, 'dist-embed'),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0, // never inline assets as data: URLs (app page CSP)
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: path.join(root, 'index.html') },
  },
}));
