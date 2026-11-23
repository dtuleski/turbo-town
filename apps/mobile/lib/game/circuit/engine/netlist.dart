import 'types.dart';

/// Union-find with union by size and path compression (web A1 `DisjointSet`).
class DisjointSet {
  final Map<String, String> _parent = {};
  final Map<String, int> _size = {};

  void add(String id) {
    if (!_parent.containsKey(id)) {
      _parent[id] = id;
      _size[id] = 1;
    }
  }

  bool has(String id) => _parent.containsKey(id);

  String find(String id) {
    var root = id;
    for (;;) {
      final next = _parent[root];
      if (next == null || next == root) break;
      root = next;
    }
    var cursor = id;
    while (cursor != root) {
      final next = _parent[cursor];
      _parent[cursor] = root;
      if (next == null) break;
      cursor = next;
    }
    return root;
  }

  void union(String a, String b) {
    add(a);
    add(b);
    final rootA = find(a);
    final rootB = find(b);
    if (rootA == rootB) return;
    final sizeA = _size[rootA] ?? 1;
    final sizeB = _size[rootB] ?? 1;
    final large = sizeA >= sizeB ? rootA : rootB;
    final small = sizeA >= sizeB ? rootB : rootA;
    _parent[small] = large;
    _size[large] = sizeA + sizeB;
  }

  List<String> members() => _parent.keys.toList();
}

typedef TerminalMergePolicy = bool Function(CircuitElement element);

bool mergeIdealConductors(CircuitElement element) => element.kind == ElementKind.wire;

/// Map every declared terminal to the smallest id of its merged set.
Map<String, String> resolveNodeIdentity(
  CircuitLayout layout, [
  TerminalMergePolicy mergesTerminals = mergeIdealConductors,
]) {
  final sets = DisjointSet();
  for (final e in layout.elements) {
    sets.add(e.terminal0);
    sets.add(e.terminal1);
  }
  for (final c in layout.connections) {
    if (sets.has(c.from) && sets.has(c.to)) sets.union(c.from, c.to);
  }
  for (final e in layout.elements) {
    if (mergesTerminals(e)) sets.union(e.terminal0, e.terminal1);
  }
  final smallestByRoot = <String, String>{};
  for (final member in sets.members()) {
    final root = sets.find(member);
    final current = smallestByRoot[root];
    if (current == null || compareIds(member, current) < 0) smallestByRoot[root] = member;
  }
  return {
    for (final member in sets.members()) member: smallestByRoot[sets.find(member)] ?? member,
  };
}

List<String> canonicalNodesOf(Map<String, String> canonical) =>
    canonical.values.toSet().toList()..sort(compareIds);

class NetlistElement {
  const NetlistElement(this.element, this.nodeA, this.nodeB);
  final CircuitElement element;
  final String nodeA;
  final String nodeB;
}

class Netlist {
  const Netlist(this.elements, this.canonicalByTerminal, this.canonicalNodes, this.layout);
  final List<NetlistElement> elements;
  final Map<String, String> canonicalByTerminal;
  final List<String> canonicalNodes;
  final CircuitLayout layout;
}

/// Netlist for a layout, or null when a connection names an undeclared terminal.
Netlist? buildNetlist(CircuitLayout layout) {
  final declared = <String>{};
  for (final e in layout.elements) {
    declared
      ..add(e.terminal0)
      ..add(e.terminal1);
  }
  for (final c in layout.connections) {
    if (!declared.contains(c.from) || !declared.contains(c.to)) return null;
  }
  final canonical = resolveNodeIdentity(layout, mergeIdealConductors);
  final elements = [
    for (final e in layout.elements)
      NetlistElement(
          e, canonical[e.terminal0] ?? e.terminal0, canonical[e.terminal1] ?? e.terminal1),
  ]..sort((a, b) => compareIds(a.element.id, b.element.id));
  return Netlist(elements, canonical, canonicalNodesOf(canonical), layout);
}
