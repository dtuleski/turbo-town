import type { GameToHost, HostToGame } from './protocol';

export interface HostChannel {
  send(message: GameToHost): void;
  onMessage(handler: (m: HostToGame) => void): () => void;
}

export interface HostSide {
  send(message: HostToGame): void;
  onMessage(handler: (m: GameToHost) => void): () => void;
}

/** Web: game and host in one page. Messages are delivered asynchronously, like a real channel. */
export function createDirectChannelPair(): { game: HostChannel; host: HostSide } {
  const toGame = new Set<(m: HostToGame) => void>();
  const toHost = new Set<(m: GameToHost) => void>();
  const deliver = <T,>(handlers: Set<(m: T) => void>, m: T) => {
    queueMicrotask(() => handlers.forEach((h) => h(m)));
  };
  return {
    game: {
      send: (m) => deliver(toHost, m),
      onMessage: (h) => {
        toGame.add(h);
        return () => toGame.delete(h);
      },
    },
    host: {
      send: (m) => deliver(toGame, m),
      onMessage: (h) => {
        toHost.add(h);
        return () => toHost.delete(h);
      },
    },
  };
}
