import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/** I-2: the slice route is declared only behind the DEV or gate-mode literal. */
describe('slice route', () => {
  const app = readFileSync(join(__dirname, '../../../App.tsx'), 'utf8');

  it('is guarded by import.meta.env.DEV or the gate mode', () => {
    expect(app).toContain(
      "import.meta.env.DEV || import.meta.env.MODE === 'gate' ? lazy(() => import('./pages/dev/MathRallySlicePage')) : null"
    );
    expect(app).toContain('{MathRallySlicePage && (');
  });

  it('names the slice page only in the guarded declaration and route', () => {
    expect(app.match(/MathRallySlicePage/g)?.length).toBe(4);
  });
});
