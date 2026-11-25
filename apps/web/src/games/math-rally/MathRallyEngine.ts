import Phaser from 'phaser';
import type { HostChannel } from './bridge/hostChannel';
import type { GameToHost } from './bridge/protocol';
import { engineConfigFields } from './core/engineConfig';
import type { EngineOptions } from './core/engineConfig';
import { createFatalErrorGuard, installPageErrorListeners } from './core/fatalErrorGuard';
import type { FatalErrorGuard } from './core/fatalErrorGuard';
import { CONTEXT_KEY } from './phaser/context';
import type { FrameSample, RaceContext } from './phaser/context';
import { BootScene } from './phaser/scenes/BootScene';
import { HudScene } from './phaser/scenes/HudScene';
import { RaceScene } from './phaser/scenes/RaceScene';

export class EngineStartError extends Error {
  constructor() {
    super('ENGINE_START_FAILED');
    this.name = 'EngineStartError';
  }
}

export interface MountOptions extends EngineOptions {
  /** App bundle: the page guard installed first by embed/pageGuard.ts. Web: absent, mount creates one. */
  errorGuard?: FatalErrorGuard;
  /** Web: only errors from this origin end a race (MR1 FD Q7). */
  errorOrigin?: string;
  announce?: (text: string) => void;
  onFrame?: (sample: FrameSample) => void;
  onIgnoredError?: (event: Event) => void;
}

export interface EngineHandle {
  destroy(): void;
  /** Dev and gate builds only: throws inside a tween callback (AC-44.2). */
  fault(): void;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

const DEV_FAULTS = import.meta.env.DEV || import.meta.env.MODE === 'gate';

/** G1: mounts the game into `parent` and talks to the host only through `channel`. */
export function mountMathRally(parent: HTMLElement, channel: HostChannel, options: MountOptions): EngineHandle {
  if (!hasWebGL()) throw new EngineStartError();

  const ownGuard = !options.errorGuard;
  const guard = options.errorGuard ?? createFatalErrorGuard((m) => channel.send(m));
  let mounted = true;
  const removeListeners = ownGuard
    ? installPageErrorListeners(window, guard, {
        origin: options.errorOrigin,
        isMounted: () => mounted,
        onIgnored: options.onIgnoredError,
      })
    : () => undefined;

  // Every message goes through here; `ready` arms the guard's INTERNAL code.
  const wrapped: HostChannel = {
    send(m: GameToHost) {
      if (m.type === 'ready') guard.markReady();
      if (m.type === 'error') {
        guard.report(m.code);
        return;
      }
      if (!guard.tripped()) channel.send(m);
    },
    onMessage: (h) => channel.onMessage(h),
  };

  let renderScale = 1;
  const size = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2) * renderScale;
    return {
      w: Math.max(1, Math.round(parent.clientWidth * ratio)),
      h: Math.max(1, Math.round(parent.clientHeight * ratio)),
    };
  };

  const ctx: RaceContext = {
    channel: wrapped,
    guard,
    assetBaseUrl: options.assetBaseUrl,
    buildId: options.buildId,
    sound: true,
    announce: options.announce ?? (() => undefined),
    onFrame: DEV_FAULTS ? options.onFrame : undefined,
    devFaults: DEV_FAULTS && options.devOverlay === true,
    storage: (() => {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    })(),
  };

  const fields = engineConfigFields(options);
  const initial = size();
  let game: Phaser.Game;
  try {
    game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent,
      width: initial.w,
      height: initial.h,
      backgroundColor: '#8fd3ff',
      banner: fields.banner,
      images: fields.images,
      loader: { baseURL: options.assetBaseUrl, imageLoadType: fields.loader.imageLoadType, localScheme: fields.loader.localScheme },
      scale: { mode: Phaser.Scale.NONE },
      render: { antialias: true, powerPreference: 'high-performance' },
      scene: [BootScene, RaceScene, HudScene],
      callbacks: {
        preBoot: (g: Phaser.Game) => g.registry.set(CONTEXT_KEY, ctx),
        postBoot: (g: Phaser.Game) => fitCanvas(g),
      },
    });
  } catch {
    removeListeners();
    throw new EngineStartError();
  }

  function fitCanvas(g: Phaser.Game): void {
    const canvas = g.canvas;
    if (!canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
  }

  ctx.setRenderScale = (factor: number) => {
    renderScale = factor;
    const s = size();
    game.scale.resize(s.w, s.h);
    fitCanvas(game);
  };

  guard.setStop(() => {
    game.loop.stop();
    game.sound.stopAll();
    ctx.announce('');
  });

  const onContextLost = (e: Event) => {
    e.preventDefault();
    guard.report('CONTEXT_LOST');
  };
  game.events.once(Phaser.Core.Events.READY, () => {
    game.canvas?.addEventListener('webglcontextlost', onContextLost);
  });

  const resizeObserver = new ResizeObserver(() => {
    const s = size();
    if (game.scale && (game.scale.width !== s.w || game.scale.height !== s.h)) {
      game.scale.resize(s.w, s.h);
      fitCanvas(game);
    }
  });
  resizeObserver.observe(parent);

  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      mounted = false;
      try {
        resizeObserver.disconnect();
        removeListeners();
        game.canvas?.removeEventListener('webglcontextlost', onContextLost);
        if (ownGuard) guard.dispose();
        game.destroy(true);
      } catch {
        /* destroy never throws */
      }
    },
    fault() {
      if (ctx.devFaults) game.scene.getScene('Race')?.events.emit('mr-fault');
    },
  };
}
