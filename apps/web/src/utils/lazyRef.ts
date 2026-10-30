// Lazy ref initialisation — a one-line helper that exists to prevent one specific bug.
//
// `useRef<X>(new X())` constructs an `X` on EVERY render: JavaScript evaluates the argument
// before the call, and `useRef` then discards everything but the first. For anything whose
// constructor allocates — a particle pool, a buffer, an audio graph — that is a per-render
// allocation thrown away immediately, and a component that re-renders on pointer move does it
// dozens of times a second.
//
// Passing the construction as a thunk through this helper makes it run at most once, however many
// times the helper is called.

/**
 * Read `cell.current`, constructing it with `create` the first time only.
 *
 * `??=` rather than `||=` on purpose: a cached value that is falsy but valid (`0`, `''`, `false`)
 * must not be reconstructed on the next call.
 */
export function lazyRefValue<T>(cell: { current: T | null }, create: () => T): T {
  cell.current ??= create()
  return cell.current
}
