import { describe, expect, it } from 'vitest';
// apps/web has no @types/node, so App.tsx is read through Vite's raw import instead of node:fs.
import app from '../../../App.tsx?raw';

/** I-2: the slice route is declared only behind the DEV or gate-mode literal. */
describe('slice route', () => {

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
