import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/** core/ stays pure: no Phaser, no React, no DOM-only modules (NFR design, logical components). */
const DIR = __dirname;
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

describe('core isolation', () => {
  it('has the core modules', () => {
    expect(files.length).toBeGreaterThanOrEqual(9);
  });
  it.each(files.map((f) => [f]))('%s imports neither Phaser nor React', (f) => {
    const code = readFileSync(join(DIR, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/from\s+['"](phaser|react|react-dom)['"]/);
    expect(code).not.toMatch(/\b(document|window)\./);
  });
});
