/**
 * Math Rally vertical slice (MR1). Dev and gate builds only: the route is not in production builds.
 * Plays the host's part with fixture races; never calls the API.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { mountMathRally, EngineStartError } from '@/games/math-rally/MathRallyEngine';
import type { EngineHandle } from '@/games/math-rally/MathRallyEngine';
import { createDirectChannelPair } from '@/games/math-rally/bridge/hostChannel';
import type { GameToHost } from '@/games/math-rally/bridge/protocol';
import { createFrameRecorder, runPasses } from '@/games/math-rally/dev/frameOverlay';
import { installViolationRecorder } from '@/games/math-rally/dev/violationRecorder';
import type { MathRallyRacePayload } from '@/games/math-rally/core/shared';
import easyRace from '@/games/math-rally/__fixtures__/slice-easy.json';
import hardRace from '@/games/math-rally/__fixtures__/slice-hard.json';

// Registered when this module is evaluated, before any engine mounts (FD Section 2).
const violations = installViolationRecorder(document, window);
(window as unknown as Record<string, unknown>).__mrViolations = violations;

type Phase = 'idle' | 'starting' | 'running' | 'paused' | 'finished' | 'error';

const MSG_LOAD = 'The race could not load.';
const MSG_START = 'Could not start the race.';
const MSG_STOPPED = 'The race stopped unexpectedly.';
const READY_TIMEOUT_MS = 20000;

export default function MathRallySlicePage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const noMount = params.get('mount') === '0';
  const [raceName, setRaceName] = useState(params.get('race') === 'easy' ? 'easy' : 'hard');
  const [touch, setTouch] = useState(params.get('touch') === '1');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ correct: number; forks: number; timeMs: number } | null>(null);
  const [live, setLive] = useState('');
  const [fps, setFps] = useState('');
  const [device, setDevice] = useState(params.get('device') ?? 'desktop');
  const [mode, setMode] = useState(params.get('composition') ?? 'n/a');
  const [run, setRun] = useState(1);
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const recorder = useMemo(() => createFrameRecorder(), []);
  const guardReports = useRef(0);
  const readySeen = useRef(false);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__mrState = { phase, message, result };
  }, [phase, message, result]);

  useEffect(() => () => engineRef.current?.destroy(), []);

  useEffect(() => {
    if (params.get('autostart') === '1' && !noMount) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const s = recorder.stats();
      setFps(s.frames > 10 ? `${s.medianFps.toFixed(0)} fps, 1% low ${s.onePercentLowFps.toFixed(0)}` : '');
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, recorder]);

  function stop(next: Phase, msg = '') {
    engineRef.current?.destroy();
    engineRef.current = null;
    setPhase(next);
    setMessage(msg);
  }

  function start() {
    if (!mountRef.current || engineRef.current) return;
    const race = (raceName === 'easy' ? easyRace : hardRace) as MathRallyRacePayload;
    recorder.reset();
    guardReports.current = 0;
    readySeen.current = false;
    setResult(null);
    setMessage('');
    setPhase('starting');
    violations.setPhase('race');
    const { game, host } = createDirectChannelPair();
    const timeout = window.setTimeout(() => {
      if (!readySeen.current) stop('error', MSG_LOAD);
    }, READY_TIMEOUT_MS);
    host.onMessage((m: GameToHost) => {
      switch (m.type) {
        case 'ready':
          readySeen.current = true;
          window.clearTimeout(timeout);
          host.send({
            v: 1,
            type: 'init',
            mode: 'scored',
            difficulty: race.difficulty,
            language: 'en',
            sound: true,
            reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
            touchUi: touch,
            race,
          });
          setPhase('running');
          break;
        case 'pauseChanged':
          setPhase(m.paused ? 'paused' : 'running');
          break;
        case 'raceFinished':
          setResult({ correct: m.correctCount, forks: race.forks, timeMs: m.raceTimeMs });
          setPhase('finished');
          break;
        case 'error':
          guardReports.current++;
          window.clearTimeout(timeout);
          stop('error', !readySeen.current ? MSG_LOAD : m.code === 'INIT_INVALID' ? MSG_START : MSG_STOPPED);
          break;
        default:
          break;
      }
    });
    try {
      engineRef.current = mountMathRally(mountRef.current, game, {
        assetBaseUrl: '/games/math-rally/',
        buildId: 'web-slice',
        devOverlay: true,
        errorOrigin: window.location.origin,
        announce: setLive,
        onFrame: (s) => recorder.record(s),
      });
    } catch (e) {
      window.clearTimeout(timeout);
      stop('error', e instanceof EngineStartError ? MSG_LOAD : MSG_LOAD);
    }
  }

  function exportCsv() {
    const csv = recorder.toCsv({ device, compositionMode: mode, run, guardReports: guardReports.current });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `math-rally-${device.replace(/\W+/g, '-')}-run${run}.csv`;
    a.click();
    setRun((r) => r + 1);
  }

  const stats = phase === 'finished' ? recorder.stats() : null;

  return (
    <div className="fixed inset-0 bg-sky-200">
      <div ref={mountRef} data-testid="mr-slice-game-mount" className="absolute inset-0" />
      <div data-testid="mr-slice-live-region" aria-live="polite" className="sr-only">
        {live}
      </div>

      {phase === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4 w-80">
            <h1 className="text-2xl font-black">Math Rally slice</h1>
            <label className="block">
              Race{' '}
              <select data-testid="mr-slice-race-select" value={raceName} onChange={(e) => setRaceName(e.target.value)} className="border rounded px-2 py-1">
                <option value="easy">Easy (2 paths, 10 forks)</option>
                <option value="hard">Hard (4 paths, 15 forks)</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input data-testid="mr-slice-touch-toggle" type="checkbox" checked={touch} onChange={(e) => setTouch(e.target.checked)} />
              Touch joystick
            </label>
            <button data-testid="mr-slice-start-button" onClick={start} disabled={noMount} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50">
              {noMount ? 'Baseline (no mount)' : 'Start'}
            </button>
          </div>
        </div>
      )}

      {phase === 'starting' && <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">Loading...</div>}

      {phase === 'finished' && result && (
        <div data-testid="mr-slice-result-panel" className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 space-y-2 w-80 text-center">
            <h2 className="text-2xl font-black">Finish!</h2>
            <p>
              {result.correct} of {result.forks} correct
            </p>
            <p>Time {(result.timeMs / 1000).toFixed(1)} s</p>
            {stats && (
              <p className={runPasses(stats) ? 'text-green-700' : 'text-red-700'}>
                {stats.medianFps.toFixed(1)} fps median, {stats.onePercentLowFps.toFixed(1)} 1% low ({runPasses(stats) ? 'pass' : 'fail'})
              </p>
            )}
            <button data-testid="mr-slice-export-csv-button" onClick={exportCsv} className="w-full py-2 rounded-xl bg-gray-800 text-white font-bold">
              Export CSV
            </button>
            <button onClick={() => stop('idle')} className="w-full py-2 rounded-xl bg-blue-600 text-white font-bold">
              Back
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div data-testid="mr-slice-error-panel" className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 space-y-4 w-80 text-center">
            <p className="text-xl font-bold">{message}</p>
            <button data-testid="mr-slice-error-back-button" onClick={() => stop('idle')} className="w-full py-2 rounded-xl bg-blue-600 text-white font-bold">
              Back
            </button>
          </div>
        </div>
      )}

      {(phase === 'running' || phase === 'paused') && (
        <div className="absolute right-2 top-16 bg-black/60 text-white text-xs rounded p-2 space-y-1 w-48">
          <div data-testid="mr-slice-fps">{fps}</div>
          <input value={device} onChange={(e) => setDevice(e.target.value)} className="w-full text-black px-1 rounded" aria-label="Device label" />
          <input value={mode} onChange={(e) => setMode(e.target.value)} className="w-full text-black px-1 rounded" aria-label="Composition mode" />
          <button data-testid="mr-slice-fault-button" onClick={() => engineRef.current?.fault()} className="w-full bg-red-600 rounded py-1 font-bold">
            Fault trigger
          </button>
        </div>
      )}
    </div>
  );
}
