/**
 * Netlist model (component A1).
 *
 * Turns a layout into electrical elements plus the nodes their terminals share. Visual
 * placement is carried through untouched and never read: node identity comes only from
 * explicit connections and from conductor elements.
 *
 * Satisfies FR-CB-4, FR-CB-15, FR-CB-16.
 */

import type {
  CircuitElement,
  CircuitLayout,
  Netlist,
  NetlistElement,
  NodeId,
  StructuralIssue,
} from './types';

/**
 * Code-unit comparison. Never `localeCompare`, which is locale dependent and would make the
 * engine's canonical node choice - and therefore its float accumulation order - vary by host.
 */
export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Union-find with union by size and path compression. */
class DisjointSet {
  private readonly parent = new Map<string, string>();

  private readonly size = new Map<string, number>();

  add(id: string): void {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      this.size.set(id, 1);
    }
  }

  has(id: string): boolean {
    return this.parent.has(id);
  }

  find(id: string): string {
    let root = id;
    for (;;) {
      const next = this.parent.get(root);
      if (next === undefined || next === root) {
        break;
      }
      root = next;
    }
    let cursor = id;
    while (cursor !== root) {
      const next = this.parent.get(cursor);
      this.parent.set(cursor, root);
      if (next === undefined) {
        break;
      }
      cursor = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) {
      return;
    }
    const sizeA = this.size.get(rootA) ?? 1;
    const sizeB = this.size.get(rootB) ?? 1;
    const [large, small] = sizeA >= sizeB ? [rootA, rootB] : [rootB, rootA];
    this.parent.set(small, large);
    this.size.set(large, sizeA + sizeB);
  }

  members(): readonly string[] {
    return Array.from(this.parent.keys());
  }
}

/** Decides whether an element's own two terminals are one electrical node. */
export type TerminalMergePolicy = (element: CircuitElement) => boolean;

/** Ideal conductors merge; everything else keeps its terminals distinct. */
export const mergeIdealConductors: TerminalMergePolicy = (element) => element.kind === 'wire';

/**
 * Map every declared terminal to its canonical electrical node.
 *
 * The canonical representative of a merged set is its lexicographically smallest member, so
 * identity depends on the set's contents and not on the order the input arrays happened to
 * arrive in. That is what makes the downstream stamping order, and therefore the exact
 * floating point result, reproducible.
 *
 * `mergesTerminals` is a parameter rather than a fixed rule because a closed switch is a
 * conductor and an open one is a break, so the policy is switch-state dependent. A2 supplies
 * the switch-aware policy; A1 uses {@link mergeIdealConductors}.
 */
export function resolveNodeIdentity(
  layout: CircuitLayout,
  mergesTerminals: TerminalMergePolicy = mergeIdealConductors
): Map<NodeId, NodeId> {
  const sets = new DisjointSet();

  for (const element of layout.elements) {
    sets.add(element.terminals[0]);
    sets.add(element.terminals[1]);
  }
  for (const connection of layout.connections) {
    if (sets.has(connection.from) && sets.has(connection.to)) {
      sets.union(connection.from, connection.to);
    }
  }
  for (const element of layout.elements) {
    if (mergesTerminals(element)) {
      sets.union(element.terminals[0], element.terminals[1]);
    }
  }

  return canonicalMapFrom(sets);
}

/** Map every member of every merged set to the smallest id in that set. */
function canonicalMapFrom(sets: DisjointSet): Map<NodeId, NodeId> {
  const smallestByRoot = new Map<string, string>();
  for (const member of sets.members()) {
    const root = sets.find(member);
    const current = smallestByRoot.get(root);
    if (current === undefined || compareIds(member, current) < 0) {
      smallestByRoot.set(root, member);
    }
  }

  const canonical = new Map<NodeId, NodeId>();
  for (const member of sets.members()) {
    canonical.set(member, smallestByRoot.get(sets.find(member)) ?? member);
  }
  return canonical;
}

/** Distinct canonical nodes of a terminal mapping, lexicographically sorted. */
export function canonicalNodesOf(canonical: ReadonlyMap<NodeId, NodeId>): NodeId[] {
  return Array.from(new Set(canonical.values())).sort(compareIds);
}

/**
 * Build the netlist for a layout.
 *
 * Returns structural issues instead of a netlist when a connection names a terminal no
 * element declares. Electrical validity - whether a closed path exists, whether the circuit
 * is shorted - is not assessed here.
 */
export function buildNetlist(layout: CircuitLayout): Netlist | StructuralIssue[] {
  const declared = new Set<NodeId>();
  for (const element of layout.elements) {
    declared.add(element.terminals[0]);
    declared.add(element.terminals[1]);
  }

  const issues: StructuralIssue[] = [];
  for (const connection of layout.connections) {
    if (!declared.has(connection.from) || !declared.has(connection.to)) {
      issues.push({
        code: 'UNRESOLVED_TERMINAL_REF',
        connectionId: connection.id,
        detail: 'connection names a terminal no element declares',
      });
    }
  }
  if (issues.length > 0) {
    return issues;
  }

  const canonical = resolveNodeIdentity(layout, mergeIdealConductors);
  const elements: NetlistElement[] = layout.elements
    .map((element) => ({
      element,
      nodeA: canonical.get(element.terminals[0]) ?? element.terminals[0],
      nodeB: canonical.get(element.terminals[1]) ?? element.terminals[1],
    }))
    .sort((left, right) => compareIds(left.element.id, right.element.id));

  return {
    elements,
    canonicalByTerminal: canonical,
    canonicalNodes: canonicalNodesOf(canonical),
    layout,
  };
}

/** Narrow the {@link buildNetlist} union. */
export function isNetlist(value: Netlist | StructuralIssue[]): value is Netlist {
  return !Array.isArray(value);
}
