import 'netlist.dart';
import 'types.dart';

double _clamp(double value, double low, double high) {
  if (!value.isFinite) return low;
  return value < low ? low : (value > high ? high : value);
}

/// A switch with no entry reads as open (fail closed).
SwitchState switchStateOf(Map<String, SwitchState> switches, String elementId) =>
    switches[elementId] == SwitchState.closed ? SwitchState.closed : SwitchState.open;

double resistanceOf(CircuitElement element) {
  final spec = kElementSpecs[element.kind]!;
  if (spec.resistance != null) return spec.resistance!;
  final declared = element.params?['resistance'];
  if (declared == null) return kDefaultResistorResistance;
  return _clamp(declared, kMinResistance, kMaxResistance);
}

double internalResistanceOf(CircuitElement element) {
  final declared = element.params?['internalResistance'];
  if (declared != null) return _clamp(declared, 0, kMaxResistance);
  return kElementSpecs[element.kind]!.internalResistance ?? 0;
}

double sourceVoltageOf(CircuitElement element, Environment env) {
  if (element.kind == ElementKind.battery) {
    return _clamp(env.sourceVoltage, kMinSourceVoltage, kMaxSourceVoltage);
  }
  if (element.kind == ElementKind.solar) {
    return kSolarMaxVoltage * _clamp(env.lightLevel, kMinLightLevel, kMaxLightLevel);
  }
  return 0;
}

class GraphEdge {
  const GraphEdge({
    required this.elementId,
    required this.kind,
    required this.from,
    required this.to,
    required this.resistance,
    required this.sourceVoltage,
  });
  final String elementId;
  final ElementKind kind;
  final String from;
  final String to;
  final double resistance;
  final double sourceVoltage;
}

class ConductionEdge {
  const ConductionEdge(
      {this.elementId, required this.from, required this.to, required this.resistance});
  final String? elementId;
  final String from;
  final String to;
  final double resistance;
}

class ConductionGraph {
  const ConductionGraph(this.nodes, this.adjacency);
  final List<String> nodes;
  final Map<String, List<ConductionEdge>> adjacency;
}

class ElectricalGraph {
  const ElectricalGraph({
    required this.nodes,
    required this.indexOf,
    required this.edges,
    required this.sources,
    required this.openSwitchIds,
    required this.mergedConductorIds,
    required this.canonicalByTerminal,
    required this.conduction,
    required this.netlist,
  });
  final List<String> nodes;
  final Map<String, int> indexOf;
  final List<GraphEdge> edges;
  final List<GraphEdge> sources;
  final List<String> openSwitchIds;
  final List<String> mergedConductorIds;
  final Map<String, String> canonicalByTerminal;
  final ConductionGraph conduction;
  final Netlist netlist;
}

class ResistancePath {
  const ResistancePath(this.resistance, this.elementIds);
  final double resistance;
  final List<String> elementIds;
}

ConductionEdge? _conductionEdgeFor(CircuitElement element, Map<String, SwitchState> switches) {
  final spec = kElementSpecs[element.kind]!;
  if (element.kind == ElementKind.switchKind &&
      switchStateOf(switches, element.id) == SwitchState.open) {
    return null;
  }
  final resistance = spec.isSource
      ? internalResistanceOf(element)
      : (spec.isConductor ? 0.0 : resistanceOf(element));
  return ConductionEdge(
    elementId: element.id,
    from: element.terminal0,
    to: element.terminal1,
    resistance: resistance,
  );
}

ConductionGraph _buildConductionGraph(Netlist netlist, Map<String, SwitchState> switches) {
  final nodes = <String>{};
  for (final entry in netlist.elements) {
    nodes
      ..add(entry.element.terminal0)
      ..add(entry.element.terminal1);
  }
  final edges = <ConductionEdge>[];
  final connections = [...netlist.layout.connections]..sort((a, b) => compareIds(a.id, b.id));
  for (final c in connections) {
    edges.add(ConductionEdge(from: c.from, to: c.to, resistance: 0));
  }
  for (final entry in netlist.elements) {
    final edge = _conductionEdgeFor(entry.element, switches);
    if (edge != null) edges.add(edge);
  }
  final sortedNodes = nodes.toList()..sort(compareIds);
  final adjacency = <String, List<ConductionEdge>>{for (final n in sortedNodes) n: []};
  for (final edge in edges) {
    adjacency[edge.from]?.add(edge);
    adjacency[edge.to]?.add(edge);
  }
  return ConductionGraph(sortedNodes, adjacency);
}

enum _Role { merged, open, edge }

_Role _conductorRoleOf(CircuitElement element, Map<String, SwitchState> switches) {
  if (element.kind == ElementKind.switchKind) {
    return switchStateOf(switches, element.id) == SwitchState.closed ? _Role.merged : _Role.open;
  }
  return kElementSpecs[element.kind]!.isConductor ? _Role.merged : _Role.edge;
}

GraphEdge _graphEdgeFor(CircuitElement element, Map<String, String> canonical, Environment env) {
  final spec = kElementSpecs[element.kind]!;
  return GraphEdge(
    elementId: element.id,
    kind: element.kind,
    from: canonical[element.terminal0] ?? element.terminal0,
    to: canonical[element.terminal1] ?? element.terminal1,
    resistance: spec.isSource ? internalResistanceOf(element) : resistanceOf(element),
    sourceVoltage: spec.isSource ? sourceVoltageOf(element, env) : 0,
  );
}

ElectricalGraph resolveTopology(
  Netlist netlist,
  Map<String, SwitchState> switches,
  Environment env,
) {
  final canonical = resolveNodeIdentity(
    netlist.layout,
    (element) =>
        element.kind == ElementKind.wire ||
        (element.kind == ElementKind.switchKind &&
            switchStateOf(switches, element.id) == SwitchState.closed),
  );
  final nodes = canonicalNodesOf(canonical);
  final indexOf = <String, int>{for (var i = 0; i < nodes.length; i++) nodes[i]: i};
  final edges = <GraphEdge>[];
  final openSwitchIds = <String>[];
  final mergedConductorIds = <String>[];
  for (final entry in netlist.elements) {
    final element = entry.element;
    switch (_conductorRoleOf(element, switches)) {
      case _Role.merged:
        mergedConductorIds.add(element.id);
      case _Role.open:
        openSwitchIds.add(element.id);
      case _Role.edge:
        edges.add(_graphEdgeFor(element, canonical, env));
    }
  }
  return ElectricalGraph(
    nodes: nodes,
    indexOf: indexOf,
    edges: edges,
    sources: [
      for (final e in edges)
        if (kElementSpecs[e.kind]!.isSource) e
    ],
    openSwitchIds: openSwitchIds,
    mergedConductorIds: mergedConductorIds,
    canonicalByTerminal: canonical,
    conduction: _buildConductionGraph(netlist, switches),
    netlist: netlist,
  );
}

/// Connected sets of canonical nodes; each sorted, ordered by first member.
List<List<String>> findConnectedComponents(ElectricalGraph graph) {
  final adjacency = <String, List<String>>{for (final n in graph.nodes) n: []};
  for (final edge in graph.edges) {
    adjacency[edge.from]?.add(edge.to);
    adjacency[edge.to]?.add(edge.from);
  }
  final seen = <String>{};
  final components = <List<String>>[];
  for (final start in graph.nodes) {
    if (seen.contains(start)) continue;
    final component = <String>[];
    final queue = <String>[start];
    seen.add(start);
    var head = 0;
    while (head < queue.length) {
      final node = queue[head++];
      component.add(node);
      for (final next in adjacency[node] ?? const <String>[]) {
        if (seen.add(next)) queue.add(next);
      }
    }
    components.add(component..sort(compareIds));
  }
  return components;
}

String? _nearest(ConductionGraph graph, Map<String, double> distance, Set<String> settled) {
  String? nearest;
  var best = double.infinity;
  for (final node in graph.nodes) {
    final known = settled.contains(node) ? null : distance[node];
    if (known != null && known < best) {
      best = known;
      nearest = node;
    }
  }
  return nearest;
}

/// Lowest total resistance route between two raw terminals (Dijkstra).
ResistancePath? minimumResistancePath(
  ConductionGraph graph,
  String from,
  String to, [
  Set<String>? excludedElementIds,
]) {
  if (!graph.adjacency.containsKey(from) || !graph.adjacency.containsKey(to)) return null;
  final distance = <String, double>{from: 0};
  final previous = <String, ({String node, String? elementId})>{};
  final settled = <String>{};
  for (;;) {
    final current = _nearest(graph, distance, settled);
    if (current == null || current == to) break;
    settled.add(current);
    final currentDistance = distance[current] ?? 0;
    for (final edge in graph.adjacency[current] ?? const <ConductionEdge>[]) {
      final excluded =
          edge.elementId != null && (excludedElementIds?.contains(edge.elementId) ?? false);
      final neighbour = edge.from == current ? edge.to : edge.from;
      if (excluded || settled.contains(neighbour)) continue;
      final candidate = currentDistance + edge.resistance;
      final known = distance[neighbour];
      if (known == null || candidate < known) {
        distance[neighbour] = candidate;
        previous[neighbour] = (node: current, elementId: edge.elementId);
      }
    }
  }
  final total = distance[to];
  if (total == null) return null;
  final traversed = <String>[];
  var cursor = to;
  while (cursor != from) {
    final step = previous[cursor];
    if (step == null) break;
    if (step.elementId != null) traversed.add(step.elementId!);
    cursor = step.node;
  }
  return ResistancePath(total, traversed..sort(compareIds));
}
