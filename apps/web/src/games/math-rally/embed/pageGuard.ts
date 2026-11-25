/**
 * First import of embed/main.ts (G16): installs the fatal-error guard before any other module runs.
 * Until the channel is attached, the guard holds at most one message.
 */
import { createFatalErrorGuard, installPageErrorListeners } from '../core/fatalErrorGuard';
import type { GameErrorMessage } from '../core/fatalErrorGuard';
import type { HostChannel } from '../bridge/hostChannel';

let channel: HostChannel | null = null;
let held: GameErrorMessage | null = null;

export const pageGuard = createFatalErrorGuard((m) => {
  if (channel) channel.send(m);
  else held = held ?? m;
});

export function attachChannel(c: HostChannel): void {
  channel = c;
  if (held) {
    c.send(held);
    held = null;
  }
}

// App page: every script is on the app-internal origin, so no origin filter.
installPageErrorListeners(window, pageGuard);
