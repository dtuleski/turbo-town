/**
 * Target machine model (component B3).
 *
 * Machines bind circuit elements to in-world roles. Everything is data, so adding a machine
 * is content rather than code (FR-CB-29, FR-CB-30).
 *
 * Satisfies FR-CB-29 and FR-CB-30.
 */

import { CURRENT_EPSILON } from './constants';
import { compareIds } from './netlist';
import type {
  CircuitResult,
  RoleActivationRule,
  TargetMachine,
} from './types';

/** Minimum brightness at which a drive motor counts as turning the wheels. */
export const DRIVE_MOTOR_INTENSITY_THRESHOLD = 0.5;

/**
 * Activation rules, keyed by the exact `activationRule` string a role declares.
 *
 * Looking a rule up by string rather than hard-coding a switch is what keeps machines
 * data-driven. An unrecognised key resolves to `false` rather than throwing, so a content
 * mistake leaves a role unpowered instead of breaking the game (SECURITY-15 fail closed).
 */
export const ROLE_ACTIVATION_RULES: Readonly<Record<string, RoleActivationRule>> = Object.freeze({
  energized: (context) => context.matching.some((element) => element.energized),
  'intensityAtLeast:0.5': (context) =>
    context.matching.some((element) => element.intensity >= DRIVE_MOTOR_INTENSITY_THRESHOLD),
  sourceDelivering: (context) =>
    context.matching.some((element) => Math.abs(element.current) > CURRENT_EPSILON),
});

export const MARS_ROVER: TargetMachine = Object.freeze({
  id: 'mars-rover',
  roles: Object.freeze([
    Object.freeze({
      roleId: 'driveMotor',
      requiredKind: 'motor' as const,
      activationRule: 'intensityAtLeast:0.5',
      presentationKey: 'circuitBuilder.machine.marsRover.driveMotor',
    }),
    Object.freeze({
      roleId: 'headlight',
      requiredKind: 'led' as const,
      activationRule: 'energized',
      presentationKey: 'circuitBuilder.machine.marsRover.headlight',
    }),
    Object.freeze({
      roleId: 'buzzerAlert',
      requiredKind: 'buzzer' as const,
      activationRule: 'energized',
      presentationKey: 'circuitBuilder.machine.marsRover.buzzerAlert',
    }),
    Object.freeze({
      roleId: 'solarCharging',
      requiredKind: 'solar' as const,
      activationRule: 'sourceDelivering',
      presentationKey: 'circuitBuilder.machine.marsRover.solarCharging',
    }),
  ]),
});

export const MACHINES: Readonly<Record<string, TargetMachine>> = Object.freeze({
  'mars-rover': MARS_ROVER,
});

export function getMachine(id: string): TargetMachine | undefined {
  return Object.prototype.hasOwnProperty.call(MACHINES, id) ? MACHINES[id] : undefined;
}

export function listMachines(): TargetMachine[] {
  return Object.keys(MACHINES)
    .sort(compareIds)
    .flatMap((id) => {
      const machine = MACHINES[id];
      return machine === undefined ? [] : [machine];
    });
}

/** Whether each of a machine's roles is currently active, keyed by `roleId`. */
export function evaluateRoleActivation(
  machine: TargetMachine,
  result: CircuitResult
): Record<string, boolean> {
  const activation: Record<string, boolean> = {};
  for (const role of machine.roles) {
    const matching = result.elements.filter((element) => element.kind === role.requiredKind);
    const rule = Object.prototype.hasOwnProperty.call(
      ROLE_ACTIVATION_RULES,
      role.activationRule
    )
      ? ROLE_ACTIVATION_RULES[role.activationRule]
      : undefined;
    activation[role.roleId] = rule === undefined ? false : rule({ matching });
  }
  return activation;
}
