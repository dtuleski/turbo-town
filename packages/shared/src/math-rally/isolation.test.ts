import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

/** The math-rally folder must import nothing outside itself (no zod, no date-fns, no other shared module). */
const ROOT = __dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__fixtures__' ? [] : sourceFiles(p);
    return p.endsWith('.ts') && !p.endsWith('.test.ts') ? [p] : [];
  });
}

describe('math-rally import isolation', () => {
  const files = sourceFiles(ROOT);

  it('finds the source files', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it.each(files.map((f) => [relative(ROOT, f), f]))('%s imports only from inside the folder', (_name, file) => {
    // Code only: comments may mention words like "from" or "Math.random".
    const text = readFileSync(file as string, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const specifiers = [...text.matchAll(/^\s*(?:import|export)\b[^;]*?\sfrom\s+['"]([^'"]+)['"]/gm)].map(
      (m) => m[1] as string
    );
    for (const spec of specifiers) {
      expect(spec.startsWith('.')).toBe(true);
      const target = resolve(join(file as string, '..'), spec);
      expect(target.startsWith(ROOT)).toBe(true);
    }
    expect(text).not.toMatch(/require\(/);
    expect(text).not.toMatch(/Math\.random|Date\.now|new Date\(/);
  });
});
