import { describe, expect, it } from 'vitest';

/** core/ stays pure: no Phaser, no React, no DOM-only modules (NFR design, logical components). */
// apps/web has no @types/node, so the sources are read through Vite's glob instead of node:fs.
const SOURCES = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
const files = Object.keys(SOURCES);

describe('core isolation', () => {
  it('has the core modules', () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
  });
  it.each(files.map((f) => [f]))('%s imports neither Phaser nor React', (f: string) => {
    const code = SOURCES[f].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/from\s+['"](phaser|react|react-dom)['"]/);
    expect(code).not.toMatch(/\b(document|window)\./);
  });
});
