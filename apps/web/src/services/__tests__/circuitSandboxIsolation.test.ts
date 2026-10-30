import { describe, expect, it } from 'vitest'
import { createSandboxSession } from '../circuitSandboxSession'

// Static module-graph proof that the sandbox cannot reach the API layer. apps/web has no
// @types/node, so the sources are read through Vite's glob instead of node:fs.
const SOURCES = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const SANDBOX_SESSION = '/src/services/circuitSandboxSession.ts'
const SANDBOX_PAGE = '/src/pages/circuit-builder/CircuitBuilderSandboxPage.tsx'
const GUIDED_SESSION = '/src/services/circuitGameSession.ts'

const EXTENSIONS = ['.ts', '.tsx']

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
}

const FROM_PATTERN = /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g
const DYNAMIC_PATTERN = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

export function specifiersOf(source: string): string[] {
  const text = stripComments(source)
  const found: string[] = []
  for (const pattern of [FROM_PATTERN, DYNAMIC_PATTERN]) {
    pattern.lastIndex = 0
    let match = pattern.exec(text)
    while (match !== null) {
      const specifier = match[1]
      if (specifier !== undefined) found.push(specifier)
      match = pattern.exec(text)
    }
  }
  return found
}

function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      out.pop()
      continue
    }
    out.push(part)
  }
  return `/${out.join('/')}`
}

function resolveInternal(base: string, files: Readonly<Record<string, string>>): string | null {
  const candidates = [base, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => `${base}/index${e}`)]
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(files, candidate)) return candidate
  }
  return null
}

/** Every module and external package reachable from `entry`, transitively. */
export function reachableFrom(entry: string, files: Readonly<Record<string, string>>): Set<string> {
  const seen = new Set<string>()
  const queue: string[] = [entry]
  while (queue.length > 0) {
    const current = queue.pop()
    if (current === undefined || seen.has(current)) continue
    seen.add(current)
    const source = files[current]
    if (source === undefined) continue
    const dir = current.slice(0, current.lastIndexOf('/'))
    for (const specifier of specifiersOf(source)) {
      let target: string | null
      if (specifier.startsWith('@/')) {
        target = resolveInternal(normalize(`/src/${specifier.slice(2)}`), files)
      } else if (specifier.startsWith('.')) {
        const resolved = normalize(`${dir}/${specifier}`)
        target = resolved.startsWith('/src/')
          ? resolveInternal(resolved, files)
          : `outside:${resolved}`
      } else {
        target = `pkg:${specifier}`
      }
      if (target === null) {
        target = `unresolved:${specifier}`
      }
      if (!seen.has(target)) queue.push(target)
    }
  }
  return seen
}

const FORBIDDEN: ReadonlyArray<(id: string) => boolean> = [
  (id) => id.startsWith('/src/api/'),
  (id) => id === 'pkg:@apollo/client' || id.startsWith('pkg:@apollo/'),
  (id) => id === 'pkg:aws-amplify' || id.startsWith('pkg:aws-amplify/') || id.startsWith('pkg:@aws-amplify/'),
  (id) => id === GUIDED_SESSION,
  (id) => id.includes('CircuitBuilderGamePage'),
  (id) => id.includes('CircuitBuilderSetupPage'),
  (id) => id.includes('useGuidedSession'),
]

function violations(reached: ReadonlySet<string>): string[] {
  return [...reached].filter((id) => FORBIDDEN.some((rule) => rule(id)))
}

const pageExists = Object.prototype.hasOwnProperty.call(SOURCES, SANDBOX_PAGE)

describe('walker self-test (so the isolation proof cannot pass vacuously)', () => {
  it('parses static, type, re-export, side-effect and dynamic specifiers and ignores comments', () => {
    const specifiers = specifiersOf(`
      // import ghost from 'ghost-line'
      /* import ghost2 from 'ghost-block' */
      import a from './a'
      import type { T } from '@/types/t'
      import { x,
        y } from 'pkg-multi'
      import 'side-effect'
      export { z } from './z'
      export * from './star'
      const lazy = () => import('./lazy')
    `)
    expect(specifiers.sort()).toEqual(
      ['./a', './lazy', './star', './z', '@/types/t', 'pkg-multi', 'side-effect'].sort()
    )
  })

  it('follows relative, alias and index edges through a synthetic graph', () => {
    const files = {
      '/src/a.ts': `import { b } from './b'\nimport '@/dir'`,
      '/src/b.ts': `import x from 'left-pad'`,
      '/src/dir/index.ts': `export * from '../c'`,
      '/src/c.tsx': ``,
      '/src/unused.ts': `import 'never'`,
    }
    const reached = reachableFrom('/src/a.ts', files)
    expect(reached.has('/src/b.ts')).toBe(true)
    expect(reached.has('pkg:left-pad')).toBe(true)
    expect(reached.has('/src/dir/index.ts')).toBe(true)
    expect(reached.has('/src/c.tsx')).toBe(true)
    expect(reached.has('pkg:never')).toBe(false)
  })

  it('the real glob sees the source files', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50)
    expect(SOURCES[SANDBOX_SESSION]).toBeDefined()
    expect(SOURCES[GUIDED_SESSION]).toBeDefined()
  })

  it('the guided session graph DOES reach the API wrapper and the GraphQL client', () => {
    const reached = reachableFrom(GUIDED_SESSION, SOURCES)
    expect(reached.has('/src/api/game.ts')).toBe(true)
    expect(reached.has('pkg:@apollo/client')).toBe(true)
    expect(violations(reached).length).toBeGreaterThan(0)
  })

  it('the forbidden rules catch a synthetic offender', () => {
    const files = { '/src/s.ts': `import '@/api/client'`, '/src/api/client.ts': `import '@apollo/client'` }
    expect(violations(reachableFrom('/src/s.ts', files)).length).toBeGreaterThan(0)
  })
})

describe('sandbox isolation', () => {
  it('the sandbox session module reaches the engine wrapper and no API or guided module', () => {
    const reached = reachableFrom(SANDBOX_SESSION, SOURCES)
    expect(reached.has('/src/utils/circuitEngine.ts')).toBe(true)
    expect(violations(reached)).toEqual([])
  })

  it('the sandbox session source never names startGame or completeGame', () => {
    const source = SOURCES[SANDBOX_SESSION] ?? ''
    expect(source).not.toMatch(/startGame|completeGame/)
  })

  it('the sandbox page exists and the walker reaches the surface and the engine from it', () => {
    expect(pageExists).toBe(true)
    const reached = reachableFrom(SANDBOX_PAGE, SOURCES)
    expect(reached.has('/src/pages/circuit-builder/CircuitBuilderSurface.tsx')).toBe(true)
    expect(reached.has('/src/utils/circuitEngine.ts')).toBe(true)
  })

  it('the sandbox page reaches no API, Apollo, Amplify, guided or setup module', () => {
    const reached = reachableFrom(SANDBOX_PAGE, SOURCES)
    expect(violations(reached)).toEqual([])
  })

  it('the sandbox page source never names startGame or completeGame', () => {
    expect(SOURCES[SANDBOX_PAGE] ?? '').not.toMatch(/startGame|completeGame/)
  })

  it('creates a sandbox with the objective-free level', () => {
    const session = createSandboxSession()
    expect(session.kind).toBe('sandbox')
    expect(session.level?.id).toBe('sandbox')
    expect(session.level?.successConditionId).toBe('none')
  })
})
