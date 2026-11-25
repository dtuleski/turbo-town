/**
 * Fatal-error guard (G1). Pure, type-only imports, so the embed page can evaluate it before any other module.
 * Sends at most one `error` per mount; stops the engine first.
 */
export type GameErrorCode = 'ENGINE_START_FAILED' | 'ASSET_LOAD_FAILED' | 'CONTEXT_LOST' | 'INIT_INVALID' | 'INTERNAL';

export interface GameErrorMessage {
  v: 1;
  type: 'error';
  code: GameErrorCode;
}

export interface FatalErrorGuard {
  setStop(stop: () => void): void;
  markReady(): void;
  report(code?: GameErrorCode): void;
  dispose(): void;
  tripped(): boolean;
}

export function createFatalErrorGuard(send: (message: GameErrorMessage) => void): FatalErrorGuard {
  let stop: (() => void) | null = null;
  let ready = false;
  let done = false;
  let disposed = false;
  return {
    setStop(fn) {
      stop = fn;
    },
    markReady() {
      ready = true;
    },
    report(code) {
      if (done || disposed) return;
      done = true;
      try {
        stop?.();
      } catch {
        /* a failing stop must not hide the error */
      }
      try {
        send({ v: 1, type: 'error', code: code ?? (ready ? 'INTERNAL' : 'ENGINE_START_FAILED') });
      } catch {
        /* nothing else to do */
      }
    },
    dispose() {
      disposed = true;
    },
    tripped: () => done,
  };
}

export interface PageListenerOptions {
  /**
   * Web only: count `error` events only from this origin (MR1 FD Q7). Undefined on the app page,
   * where every script is on the app-internal origin.
   */
  origin?: string;
  /** Web only: count `unhandledrejection` only while the game is mounted. */
  isMounted?: () => boolean;
  /** Dev builds: receives the events the filter ignored. */
  onIgnored?: (event: Event) => void;
}

/**
 * Adds 'error' and 'unhandledrejection' listeners (bubble phase) that call guard.report().
 * Returns a remover. No preventDefault: the browser still logs the error.
 */
export function installPageErrorListeners(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  guard: FatalErrorGuard,
  options: PageListenerOptions = {}
): () => void {
  const onError = (event: Event) => {
    const filename = (event as ErrorEvent).filename;
    if (options.origin !== undefined && !(typeof filename === 'string' && filename.startsWith(options.origin))) {
      options.onIgnored?.(event);
      return;
    }
    guard.report();
  };
  const onRejection = (event: Event) => {
    if (options.isMounted && !options.isMounted()) {
      options.onIgnored?.(event);
      return;
    }
    guard.report();
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
