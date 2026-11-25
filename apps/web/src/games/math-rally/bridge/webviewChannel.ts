import type { HostChannel } from './hostChannel';
import type { GameToHost, HostToGame } from './protocol';

/**
 * App bundle channel (G15): game to host through the flutter_inappwebview JavaScript handler
 * `mathRally`; host to game through `window.mathRallyReceive(text)`, which the app calls with
 * evaluateJavascript. One JSON text per message, at most 16 KB (methods file Section 4).
 */
export const MAX_MESSAGE_BYTES = 16384;
const HOST_TYPES = new Set(['init', 'pause', 'resume', 'setSound']);

interface InAppWebViewBridge {
  callHandler(name: string, ...args: unknown[]): Promise<unknown>;
}

type BridgeWindow = Window & {
  flutter_inappwebview?: InAppWebViewBridge;
  mathRallyReceive?: (text: string) => void;
};

/** Minimal envelope check; the game validates the race payload itself (BootScene). */
export function parseHostMessage(text: string): HostToGame | null {
  if (typeof text !== 'string' || text.length > MAX_MESSAGE_BYTES) return null;
  let m: unknown;
  try {
    m = JSON.parse(text);
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  if (o.v !== 1 || typeof o.type !== 'string' || !HOST_TYPES.has(o.type)) return null;
  if (o.type === 'setSound' && typeof o.sound !== 'boolean') return null;
  return o as unknown as HostToGame;
}

export function createWebViewChannel(win: BridgeWindow): HostChannel {
  const handlers = new Set<(m: HostToGame) => void>();
  const queue: string[] = [];
  let flushing = false;

  const flush = () => {
    const bridge = win.flutter_inappwebview;
    if (!bridge || flushing) return;
    flushing = true;
    while (queue.length) void bridge.callHandler('mathRally', queue.shift() as string);
    flushing = false;
  };
  // The bridge object may appear after the page script runs.
  win.addEventListener('flutterInAppWebViewPlatformReady', flush);

  win.mathRallyReceive = (text: string) => {
    const m = parseHostMessage(text);
    if (m) handlers.forEach((h) => h(m));
  };

  return {
    send(message: GameToHost) {
      const text = JSON.stringify(message);
      if (text.length > MAX_MESSAGE_BYTES) return;
      queue.push(text);
      flush();
    },
    onMessage(h) {
      handlers.add(h);
      return () => handlers.delete(h);
    },
  };
}

/** Dev and gate builds: sends a text file (frame CSV, check results) to the app, which saves it. */
export function sendDevFile(win: BridgeWindow, name: string, content: string): void {
  void win.flutter_inappwebview?.callHandler('mathRallyDev', JSON.stringify({ name, content }));
}
