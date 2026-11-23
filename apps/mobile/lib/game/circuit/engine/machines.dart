import 'types.dart';

/// Minimum brightness at which a drive motor counts as turning the wheels.
const double kDriveMotorIntensityThreshold = 0.5;

class MachineRole {
  const MachineRole(this.roleId, this.requiredKind, this.activationRule, this.presentationKey);
  final String roleId;
  final ElementKind requiredKind;
  final String activationRule;
  final String presentationKey;
}

class TargetMachine {
  const TargetMachine(this.id, this.roles);
  final String id;
  final List<MachineRole> roles;
}

typedef RoleActivationRule = bool Function(List<ElementResult> matching);

final Map<String, RoleActivationRule> kRoleActivationRules = {
  'energized': (m) => m.any((e) => e.energized),
  'intensityAtLeast:0.5': (m) => m.any((e) => e.intensity >= kDriveMotorIntensityThreshold),
  'sourceDelivering': (m) => m.any((e) => e.current.abs() > kCurrentEpsilon),
};

const TargetMachine kMarsRover = TargetMachine('mars-rover', [
  MachineRole('driveMotor', ElementKind.motor, 'intensityAtLeast:0.5',
      'circuitBuilder.machine.marsRover.driveMotor'),
  MachineRole(
      'headlight', ElementKind.led, 'energized', 'circuitBuilder.machine.marsRover.headlight'),
  MachineRole('buzzerAlert', ElementKind.buzzer, 'energized',
      'circuitBuilder.machine.marsRover.buzzerAlert'),
  MachineRole('solarCharging', ElementKind.solar, 'sourceDelivering',
      'circuitBuilder.machine.marsRover.solarCharging'),
]);

TargetMachine? getMachine(String id) => id == kMarsRover.id ? kMarsRover : null;

/// Whether each role of [machine] is active, keyed by role id.
Map<String, bool> evaluateRoleActivation(TargetMachine machine, CircuitResult result) {
  final activation = <String, bool>{};
  for (final role in machine.roles) {
    final matching = [
      for (final e in result.elements)
        if (e.kind == role.requiredKind) e
    ];
    final rule = kRoleActivationRules[role.activationRule];
    activation[role.roleId] = rule == null ? false : rule(matching);
  }
  return activation;
}

// ---------------------------------------------------------------------------
// Success predicates (web success.ts)
// ---------------------------------------------------------------------------

class SuccessClause {
  const SuccessClause(this.clauseId, this.predicate);
  final String clauseId;
  final bool Function(CircuitResult result, TargetMachine machine) predicate;
}

bool Function(CircuitResult, TargetMachine) _roleActive(String roleId) =>
    (result, machine) => evaluateRoleActivation(machine, result)[roleId] == true;

final SuccessClause _noBlockingFault = SuccessClause(
  'noBlockingFault',
  (result, _) => !result.faults.any(
    (f) => f.code == FaultCode.shortCircuit || f.code == FaultCode.singularSystem,
  ),
);

final Map<String, List<SuccessClause>> kSuccessConditions = {
  'rover-headlight-on': [_noBlockingFault, SuccessClause('headlightOn', _roleActive('headlight'))],
  'rover-fully-powered': [
    _noBlockingFault,
    SuccessClause('driveMotorTurning', _roleActive('driveMotor')),
    SuccessClause('headlightOn', _roleActive('headlight')),
    SuccessClause('buzzerSounding', _roleActive('buzzerAlert')),
  ],
  'none': [SuccessClause('sandboxHasNoObjective', (_, __) => false)],
};

class SuccessOutcome {
  const SuccessOutcome(this.satisfied, this.unmetClauses);
  final bool satisfied;
  final List<String> unmetClauses;
}

/// Fails closed on an unknown machine or condition.
SuccessOutcome evaluateSuccess(LevelDefinition level, CircuitResult result) {
  final machine = getMachine(level.targetMachineId);
  if (machine == null) return const SuccessOutcome(false, ['unknownTargetMachine']);
  final clauses = kSuccessConditions[level.successConditionId];
  if (clauses == null) return const SuccessOutcome(false, ['unknownSuccessCondition']);
  final unmet = [
    for (final c in clauses)
      if (!c.predicate(result, machine)) c.clauseId
  ];
  return SuccessOutcome(unmet.isEmpty, unmet);
}
