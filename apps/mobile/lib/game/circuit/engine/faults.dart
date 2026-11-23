import 'netlist.dart';
import 'topology.dart';
import 'types.dart';

const Map<FaultCode, int> _severity = {
  FaultCode.shortCircuit: 0,
  FaultCode.singularSystem: 1,
  FaultCode.overcurrent: 2,
  FaultCode.reversedPolarity: 3,
};

Set<String> _sourceElementIds(ElectricalGraph graph) => {
      for (final e in graph.netlist.elements)
        if (kElementSpecs[e.element.kind]!.isSource) e.element.id,
    };

List<String>? _shortCircuitPathElements(
  ElectricalGraph graph,
  String sourceElementId,
  Set<String> excluded,
) {
  NetlistElement? source;
  for (final e in graph.netlist.elements) {
    if (e.element.id == sourceElementId) {
      source = e;
      break;
    }
  }
  if (source == null) return null;
  final path = minimumResistancePath(
    graph.conduction,
    source.element.terminal0,
    source.element.terminal1,
    excluded,
  );
  if (path == null || path.resistance >= kShortCircuitResistanceThreshold) return null;
  return path.elementIds;
}

bool _isOverdrawn(ElementResult result) {
  final magnitude = result.current.abs();
  if (magnitude <= kCurrentEpsilon) return false;
  return result.voltageDrop.abs() / magnitude < kShortCircuitResistanceThreshold;
}

GridPosition? locateFaultPosition(Fault fault, CircuitLayout layout) {
  for (final id in fault.elementIds) {
    for (final e in layout.elements) {
      if (e.id == id) return e.position;
    }
  }
  return null;
}

List<Fault> _detectShortCircuits(ElectricalGraph graph, List<ElementResult> results) {
  final excluded = _sourceElementIds(graph);
  final byId = {for (final r in results) r.elementId: r};
  final faults = <Fault>[];
  for (final source in graph.sources) {
    final offending = _shortCircuitPathElements(graph, source.elementId, excluded);
    if (offending != null) {
      faults.add(Fault(FaultCode.shortCircuit, [...offending, source.elementId]));
      continue;
    }
    final solved = byId[source.elementId];
    if (solved != null && _isOverdrawn(solved)) {
      faults.add(Fault(FaultCode.shortCircuit, [source.elementId]));
    }
  }
  return faults;
}

List<Fault> _detectLoadFaults(List<ElementResult> results) {
  final faults = <Fault>[];
  for (final r in results) {
    final spec = kElementSpecs[r.kind]!;
    if (spec.polarized && r.current < -kCurrentEpsilon) {
      faults.add(Fault(FaultCode.reversedPolarity, [r.elementId]));
      continue;
    }
    final rated = spec.ratedCurrent;
    if (rated != null && r.current.abs() > rated) {
      faults.add(Fault(FaultCode.overcurrent, [r.elementId]));
    }
  }
  return faults;
}

int _compareFaults(Fault a, Fault b) {
  final bySeverity = _severity[a.code]! - _severity[b.code]!;
  if (bySeverity != 0) return bySeverity;
  return compareIds(a.elementIds.isEmpty ? '' : a.elementIds.first,
      b.elementIds.isEmpty ? '' : b.elementIds.first);
}

List<Fault> detectFaults(List<ElementResult> elements, ElectricalGraph graph, bool singular) {
  final faults = <Fault>[..._detectShortCircuits(graph, singular ? const [] : elements)];
  if (singular) {
    faults.add(Fault(
      FaultCode.singularSystem,
      graph.sources.map((s) => s.elementId).toList()..sort(compareIds),
    ));
  } else {
    faults.addAll(_detectLoadFaults(elements));
  }
  // Dart's List.sort is not stable; sort an indexed copy to keep input order for ties,
  // as the stable TypeScript sort does.
  final indexed = [for (var i = 0; i < faults.length; i++) (i, faults[i])]..sort((a, b) {
      final c = _compareFaults(a.$2, b.$2);
      return c != 0 ? c : a.$1.compareTo(b.$1);
    });
  return [
    for (final (_, fault) in indexed)
      Fault(fault.code, fault.elementIds, locateFaultPosition(fault, graph.netlist.layout)),
  ];
}
