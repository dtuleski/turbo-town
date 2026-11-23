import 'faults.dart';
import 'netlist.dart';
import 'solver.dart';
import 'topology.dart';
import 'types.dart';
import 'validation.dart';

/// Evaluates a circuit. Pure and deterministic; never throws (web `evaluate`).
///
/// A singular system is not an error: it yields zeroed element values and a
/// `singularSystem` fault so the player can see what went wrong.
EvaluationOutcome evaluate(
  CircuitLayout layout,
  Map<String, SwitchState> switches,
  Environment env,
) {
  try {
    final issues = validateStructure(layout, switches, env);
    if (issues.isNotEmpty) return EvaluationOutcome.failure(classifyIssues(issues));
    final netlist = buildNetlist(layout);
    if (netlist == null) {
      return const EvaluationOutcome.failure(EvaluationErrorCode.structuralInvalid);
    }
    final graph = resolveTopology(netlist, switches, env);
    final system = buildConductanceMatrix(graph);
    final values = solveGaussian(system.matrix, system.rhs);
    if (values == null) {
      final elements = [
        for (final e in netlist.elements)
          ElementResult(
            elementId: e.element.id,
            kind: e.element.kind,
            current: 0,
            voltageDrop: 0,
            energized: false,
            intensity: 0,
          ),
      ]..sort((a, b) => compareIds(a.elementId, b.elementId));
      return EvaluationOutcome.result(CircuitResult(
        nodeVoltages: {for (final n in graph.nodes) n: 0.0},
        elements: elements,
        faults: detectFaults(elements, graph, true),
        closedPathExists: false,
        totalResistance: 0,
        totalCurrent: 0,
      ));
    }
    final elements = deriveElementResults(system, values, graph);
    final totals = summarize(graph, elements);
    return EvaluationOutcome.result(CircuitResult(
      nodeVoltages: nodeVoltagesOf(system, values, graph),
      elements: elements,
      faults: detectFaults(elements, graph, false),
      // FR-CB-10 read off the solved currents: a load that carries current.
      closedPathExists: elements.any(
        (e) => kElementSpecs[e.kind]!.isLoad && e.current.abs() > kCurrentEpsilon,
      ),
      totalResistance: totals.totalResistance,
      totalCurrent: totals.totalCurrent,
    ));
  } catch (_) {
    return const EvaluationOutcome.failure(EvaluationErrorCode.internalError);
  }
}
