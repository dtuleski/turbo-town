import { attachChannel, pageGuard } from './pageGuard';
import { installViolationRecorder } from '../dev/violationRecorder';
import { createFrameRecorder } from '../dev/frameOverlay';
import { createWebViewChannel, sendDevFile } from '../bridge/webviewChannel';
import type { HostChannel } from '../bridge/hostChannel';
import { mountMathRally } from '../MathRallyEngine';
import type { EngineHandle } from '../MathRallyEngine';
import './embed.css';

const GATE = import.meta.env.MODE === 'gate';
const params = new URLSearchParams(window.location.search);

// Gate builds: the violation recorder is registered before the engine module is evaluated further.
const violations = GATE ? installViolationRecorder(document, window) : null;
if (violations) violations.setPhase('race');

const raw = createWebViewChannel(window);
attachChannel(raw);

const recorder = GATE ? createFrameRecorder() : null;
let finished = 0;
const channel: HostChannel = {
  send(m) {
    raw.send(m);
    if (GATE && m.type === 'raceFinished' && recorder) {
      finished++;
      sendDevFile(window, `frames-run${finished}.csv`, recorder.toCsv({ device: params.get('device') ?? 'app', compositionMode: params.get('composition') ?? 'default', run: finished, guardReports: pageGuard.tripped() ? 1 : 0 }));
      sendDevFile(window, `violations-run${finished}.json`, JSON.stringify(violations?.records() ?? []));
      recorder.reset();
    }
    if (GATE && m.type === 'error') {
      sendDevFile(window, 'violations-error.json', JSON.stringify(violations?.records() ?? []));
    }
  },
  onMessage: (h) => raw.onMessage(h),
};

const parent = document.getElementById('game') as HTMLElement;
let engine: EngineHandle | null = null;
try {
  engine = mountMathRally(parent, channel, {
    assetBaseUrl: './',
    buildId: (import.meta.env.VITE_MR_BUILD_ID as string | undefined) ?? 'app-spike',
    localSchemes: ['dashden-game://'],
    errorGuard: pageGuard,
    devOverlay: GATE,
    onFrame: recorder ? (s) => recorder.record(s) : undefined,
  });
} catch {
  pageGuard.report('ENGINE_START_FAILED');
}

if (GATE) {
  // Spike helpers the app calls through evaluateJavascript.
  const w = window as unknown as Record<string, unknown>;
  w.mathRallyFault = () => engine?.fault();
  w.mathRallyViolations = () => JSON.stringify(violations?.records() ?? []);
  // Loader status test (U19): one image, one atlas JSON, one audio file and one missing file through fetch,
  // which uses the same scheme handler as Phaser's XHR loader.
  w.mathRallyLoaderTest = async () => {
    const out: Record<string, string> = {};
    for (const f of ['atlas.png', 'atlas.json', 'sfx/chime.wav', 'missing-file.png']) {
      try {
        const xhr = await new Promise<XMLHttpRequest>((resolve) => {
          const x = new XMLHttpRequest();
          x.open('GET', f);
          x.onloadend = () => resolve(x);
          x.send();
        });
        out[f] = `status ${xhr.status}, ${xhr.getResponseHeader('content-type') ?? 'no type'}, ${xhr.response ? (xhr.response as string).length : 0} bytes`;
      } catch (e) {
        out[f] = `error ${String(e)}`;
      }
    }
    sendDevFile(window, 'loader-test.json', JSON.stringify(out, null, 2));
  };
}
