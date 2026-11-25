import { describe, expect, it, vi } from 'vitest';
import { BUILTIN_TEXTURE_KEYS, PHASER_DEFAULT_LOCAL_SCHEMES, engineConfigFields } from './engineConfig';
import { createFatalErrorGuard, installPageErrorListeners } from './fatalErrorGuard';
import type { GameErrorMessage } from './fatalErrorGuard';

describe('createFatalErrorGuard (AC-44.3)', () => {
  it('two reports give one message, ENGINE_START_FAILED before ready', () => {
    const sent: GameErrorMessage[] = [];
    const g = createFatalErrorGuard((m) => sent.push(m));
    g.report();
    g.report('INTERNAL');
    expect(sent).toEqual([{ v: 1, type: 'error', code: 'ENGINE_START_FAILED' }]);
    expect(g.tripped()).toBe(true);
  });

  it('INTERNAL after ready, or the code given', () => {
    const a: GameErrorMessage[] = [];
    const g = createFatalErrorGuard((m) => a.push(m));
    g.markReady();
    g.report();
    expect(a[0]!.code).toBe('INTERNAL');
    const b: GameErrorMessage[] = [];
    createFatalErrorGuard((m) => b.push(m)).report('ASSET_LOAD_FAILED');
    expect(b[0]!.code).toBe('ASSET_LOAD_FAILED');
  });

  it('stops first; a throwing stop or send neither escapes nor causes a second message', () => {
    const order: string[] = [];
    const g = createFatalErrorGuard(() => {
      order.push('send');
      throw new Error('send failed');
    });
    g.setStop(() => {
      order.push('stop');
      throw new Error('stop failed');
    });
    expect(() => g.report()).not.toThrow();
    expect(() => g.report()).not.toThrow();
    expect(order).toEqual(['stop', 'send']);
  });

  it('does nothing after dispose', () => {
    const send = vi.fn();
    const g = createFatalErrorGuard(send);
    g.dispose();
    g.report();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('installPageErrorListeners', () => {
  function errorEvent(filename: string): Event {
    const e = new Event('error');
    Object.defineProperty(e, 'filename', { value: filename });
    return e;
  }

  it('error and unhandledrejection reach the guard; after removal neither does', () => {
    const target = new EventTarget();
    const report = vi.fn();
    const remove = installPageErrorListeners(target, { report } as never);
    target.dispatchEvent(errorEvent('app.js'));
    target.dispatchEvent(new Event('unhandledrejection'));
    expect(report).toHaveBeenCalledTimes(2);
    remove();
    target.dispatchEvent(errorEvent('app.js'));
    target.dispatchEvent(new Event('unhandledrejection'));
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('web filter: errors from another origin are ignored and recorded (MR1 FD Q7, R-5)', () => {
    const target = new EventTarget();
    const report = vi.fn();
    const ignored = vi.fn();
    installPageErrorListeners(target, { report } as never, {
      origin: 'https://dashden.app',
      isMounted: () => false,
      onIgnored: ignored,
    });
    target.dispatchEvent(errorEvent('chrome-extension://abc/content.js'));
    target.dispatchEvent(errorEvent(''));
    target.dispatchEvent(new Event('unhandledrejection'));
    expect(report).not.toHaveBeenCalled();
    expect(ignored).toHaveBeenCalledTimes(3);
    target.dispatchEvent(errorEvent('https://dashden.app/assets/math-rally.js'));
    expect(report).toHaveBeenCalledTimes(1);
  });
});

describe('engineConfigFields', () => {
  it.each([
    { assetBaseUrl: '/games/math-rally/', buildId: 'web' },
    { assetBaseUrl: './', buildId: 'app-0123456789ab', localSchemes: ['dashden-game://', 'file://'] },
  ])('built-in textures from sys/, HTMLImageElement, schemes merged ($buildId)', (options) => {
    const f = engineConfigFields(options);
    for (const v of Object.values(f.images)) expect(v.startsWith(`${options.assetBaseUrl}sys/`)).toBe(true);
    expect(f.loader.imageLoadType).toBe('HTMLImageElement');
    expect(f.loader.localScheme.slice(0, 2)).toEqual([...PHASER_DEFAULT_LOCAL_SCHEMES]);
    expect(new Set(f.loader.localScheme).size).toBe(f.loader.localScheme.length);
    if (options.localSchemes) expect(f.loader.localScheme).toContain('dashden-game://');
    expect(JSON.stringify(f)).not.toMatch(/"(data|blob):/);
    expect(f.banner).toBe(false);
  });
  it('names the Phaser 4.2.1 built-in textures', () => {
    expect(BUILTIN_TEXTURE_KEYS).toEqual(['__DEFAULT', '__MISSING', '__WHITE', '__NORMAL']);
  });
});
