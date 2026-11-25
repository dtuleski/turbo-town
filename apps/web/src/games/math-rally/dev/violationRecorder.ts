/**
 * Records CSP violations and every data: or blob: image URL requested (G17, dev and gate builds only).
 * Registered before the engine mounts (FD Section 2).
 */
export interface ViolationRecord {
  kind: 'csp' | 'dataUrl';
  directive: string;
  blockedScheme: string;
  blockedOrigin: string;
  sourceFile: string;
  phase: 'baseline' | 'race';
}

export interface ViolationRecorder {
  records(): readonly ViolationRecord[];
  setPhase(p: 'baseline' | 'race'): void;
  dispose(): void;
}

function schemeOf(url: string): string {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  return m ? (m[1] as string).toLowerCase() : '';
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function installViolationRecorder(doc: Document, win: Window & typeof globalThis): ViolationRecorder {
  const list: ViolationRecord[] = [];
  let phase: 'baseline' | 'race' = 'baseline';

  const onViolation = (e: Event) => {
    const v = e as SecurityPolicyViolationEvent;
    list.push({
      kind: 'csp',
      directive: v.effectiveDirective || v.violatedDirective,
      blockedScheme: schemeOf(v.blockedURI) || v.blockedURI,
      blockedOrigin: originOf(v.blockedURI),
      sourceFile: v.sourceFile || '',
      phase,
    });
  };
  doc.addEventListener('securitypolicyviolation', onViolation);

  // Watch image src assignments for data: and blob: URLs (Phaser creates Image objects off-DOM).
  const proto = win.HTMLImageElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'src');
  if (desc?.set && desc.get) {
    const set = desc.set;
    Object.defineProperty(proto, 'src', {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set(this: HTMLImageElement, value: string) {
        const scheme = schemeOf(String(value));
        if (scheme === 'data' || scheme === 'blob') {
          const stack = new Error().stack ?? '';
          const file = /(https?:\/\/[^\s)]+)/.exec(stack.split('\n').slice(2).join('\n'))?.[1] ?? '';
          list.push({ kind: 'dataUrl', directive: 'img-src', blockedScheme: scheme, blockedOrigin: '', sourceFile: file, phase });
        }
        set.call(this, value);
      },
    });
  }

  return {
    records: () => list,
    setPhase: (p) => {
      phase = p;
    },
    dispose() {
      doc.removeEventListener('securitypolicyviolation', onViolation);
      if (desc) Object.defineProperty(proto, 'src', desc);
    },
  };
}
