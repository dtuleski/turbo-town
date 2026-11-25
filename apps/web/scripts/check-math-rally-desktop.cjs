#!/usr/bin/env node
/**
 * MR1 Step 9: desktop CSP and fault checks in headless Chromium and WebKit (Playwright, run ad hoc).
 *
 *   1. npx vite build --config vite.math-rally-gate.config.ts --mode gate
 *   2. MR_CSP=app npx vite preview --config vite.math-rally-gate.config.ts --mode gate  (port 4173)
 *   3. NODE_PATH=/tmp/pw/node_modules node scripts/check-math-rally-desktop.cjs app > report-app.json
 *
 * Playwright is not a dependency of apps/web; install it in a scratch folder (npm i playwright).
 * Per browser: baseline (?mount=0), a Hard race for 12 s, then the Fault trigger (F8).
 */
const { chromium, webkit } = require('playwright');

const policy = process.argv[2] ?? 'app';
const BASE = process.env.MR_URL ?? 'http://localhost:4173/dev/math-rally-slice';

async function run(browserType, name) {
  const browser = await browserType.launch(
    name === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}
  );
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));

  const read = () => page.evaluate(() => ({ v: window.__mrViolations?.records() ?? [], s: window.__mrState ?? null }));

  await page.goto(`${BASE}?mount=0`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const baseline = (await read()).v.slice();

  await page.goto(`${BASE}?autostart=1&race=hard`, { waitUntil: 'networkidle' });
  let state = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    state = (await read()).s;
    if (state && (state.phase === 'running' || state.phase === 'error')) break;
  }
  await page.waitForTimeout(12000);
  const during = await read();

  let faultMessage = null;
  if (during.s?.phase === 'running') {
    await page.keyboard.press('F8');
    await page.waitForTimeout(1500);
    const after = await read();
    faultMessage = after.s?.phase === 'error' ? after.s.message : `phase ${after.s?.phase}`;
  }
  const fps = await page.locator('[data-testid="mr-slice-fps"]').textContent().catch(() => null);
  await browser.close();
  return {
    browser: name,
    policy,
    baselineViolations: baseline,
    raceViolations: during.v.filter((r) => r.phase === 'race'),
    startState: state,
    stateAfter12s: during.s,
    headlessFps: fps,
    faultMessage,
    consoleErrors,
    pageErrors,
  };
}

(async () => {
  const out = [];
  for (const [t, n] of [
    [chromium, 'chromium'],
    [webkit, 'webkit'],
  ]) {
    try {
      out.push(await run(t, n));
    } catch (e) {
      out.push({ browser: n, policy, failed: String(e) });
    }
  }
  console.log(JSON.stringify(out, null, 2));
})();
