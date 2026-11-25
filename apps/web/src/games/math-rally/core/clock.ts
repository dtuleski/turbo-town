/** Race clock (G10): integer milliseconds since start, paused time excluded. */
export interface RaceClock {
  start(nowMs: number): void;
  pause(nowMs: number): void;
  resume(nowMs: number): void;
  elapsedMs(nowMs: number): number;
  isRunning(): boolean;
}

export function createRaceClock(): RaceClock {
  let startedAt: number | null = null;
  let pausedAt: number | null = null;
  let pausedTotal = 0;

  return {
    start(nowMs) {
      startedAt = nowMs;
      pausedAt = null;
      pausedTotal = 0;
    },
    pause(nowMs) {
      if (startedAt !== null && pausedAt === null) pausedAt = nowMs;
    },
    resume(nowMs) {
      if (pausedAt !== null) {
        pausedTotal += Math.max(0, nowMs - pausedAt);
        pausedAt = null;
      }
    },
    elapsedMs(nowMs) {
      if (startedAt === null) return 0;
      const end = pausedAt ?? nowMs;
      return Math.max(0, Math.floor(end - startedAt - pausedTotal));
    },
    isRunning() {
      return startedAt !== null && pausedAt === null;
    },
  };
}
