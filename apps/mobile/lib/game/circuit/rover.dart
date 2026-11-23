// Mars Rover view model (web `marsRover.ts`): what the rover panel draws.
import 'engine/engine.dart';

class RoverRoleView {
  const RoverRoleView({
    required this.roleId,
    required this.labelKey,
    required this.active,
    required this.available,
  });
  final String roleId;

  /// The machine's own presentation key, e.g. `circuitBuilder.machine.marsRover.headlight`.
  final String labelKey;
  final bool active;

  /// The level offers the part this role needs, to place or already placed.
  final bool available;
}

class RoverView {
  const RoverView(this.roles, this.allRequiredActive);
  final List<RoverRoleView> roles;
  final bool allRequiredActive;
}

Set<ElementKind> _offeredKinds(LevelDefinition level) => {
      for (final e in level.availableComponents.entries)
        if (e.value > 0) e.key,
      for (final e in level.prePlaced) e.kind,
    };

/// Fails closed: no result, a blown fuse or an unknown machine never shows a
/// role as active.
RoverView deriveRoverView(LevelDefinition level, CircuitResult? result, bool fuseBlown) {
  final machine = getMachine(level.targetMachineId);
  if (machine == null) return const RoverView([], false);
  final offered = _offeredKinds(level);
  final powered = result != null && !fuseBlown;
  final activation = powered ? evaluateRoleActivation(machine, result) : const <String, bool>{};
  final roles = [
    for (final role in machine.roles)
      RoverRoleView(
        roleId: role.roleId,
        labelKey: role.presentationKey,
        active: powered && activation[role.roleId] == true,
        available: offered.contains(role.requiredKind),
      ),
  ];
  final available = roles.where((r) => r.available).toList();
  return RoverView(roles, available.isNotEmpty && available.every((r) => r.active));
}
