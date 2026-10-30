import {
  DRIVE_MOTOR_INTENSITY_THRESHOLD,
  MARS_ROVER,
  ROLE_ACTIVATION_RULES,
  evaluateRoleActivation,
  getMachine,
  listMachines,
} from './machines';
import type { CircuitResult, ElementKind, ElementResult, TargetMachine } from './types';

function entry(
  elementId: string,
  kind: ElementKind,
  overrides: Partial<ElementResult> = {}
): ElementResult {
  return {
    elementId,
    kind,
    current: 0,
    voltageDrop: 0,
    energized: false,
    intensity: 0,
    ...overrides,
  };
}

function resultWith(elements: readonly ElementResult[]): CircuitResult {
  return {
    nodeVoltages: {},
    elements,
    faults: [],
    closedPathExists: true,
    totalResistance: 0,
    totalCurrent: 0,
  };
}

describe('getMachine', () => {
  it('returns the Mars Rover and nothing for an unknown id', () => {
    expect(getMachine('mars-rover')).toBe(MARS_ROVER);
    expect(getMachine('nope')).toBeUndefined();
    expect(getMachine('toString')).toBeUndefined();
  });
});

describe('listMachines', () => {
  it('lists the MVP machine', () => {
    expect(listMachines().map((machine) => machine.id)).toEqual(['mars-rover']);
  });
});

describe('MARS_ROVER', () => {
  it('binds the four rover roles to the kinds they need', () => {
    expect(MARS_ROVER.roles.map((role) => [role.roleId, role.requiredKind])).toEqual([
      ['driveMotor', 'motor'],
      ['headlight', 'led'],
      ['buzzerAlert', 'buzzer'],
      ['solarCharging', 'solar'],
    ]);
  });

  it('carries a presentation key for every role rather than an asset', () => {
    for (const role of MARS_ROVER.roles) {
      expect(role.presentationKey).toMatch(/^circuitBuilder\.machine\.marsRover\./);
    }
  });

  it('declares only activation rules the registry knows', () => {
    for (const role of MARS_ROVER.roles) {
      expect(Object.keys(ROLE_ACTIVATION_RULES)).toContain(role.activationRule);
    }
  });
});

describe('evaluateRoleActivation', () => {
  it('leaves every role inactive for a dead circuit', () => {
    expect(evaluateRoleActivation(MARS_ROVER, resultWith([]))).toEqual({
      driveMotor: false,
      headlight: false,
      buzzerAlert: false,
      solarCharging: false,
    });
  });

  it('activates each role when an element of its kind satisfies the rule', () => {
    const activation = evaluateRoleActivation(
      MARS_ROVER,
      resultWith([
        entry('m', 'motor', { energized: true, intensity: 0.9, current: 0.2 }),
        entry('l', 'led', { energized: true, intensity: 0.9, current: 0.018 }),
        entry('b', 'buzzer', { energized: true, intensity: 0.6, current: 0.05 }),
        entry('s', 'solar', { energized: true, current: -0.2 }),
      ])
    );

    expect(activation).toEqual({
      driveMotor: true,
      headlight: true,
      buzzerAlert: true,
      solarCharging: true,
    });
  });

  it('keeps the drive motor inactive below the intensity threshold and active above it', () => {
    const dim = evaluateRoleActivation(
      MARS_ROVER,
      resultWith([entry('m', 'motor', { energized: true, intensity: 0.3 })])
    );
    const bright = evaluateRoleActivation(
      MARS_ROVER,
      resultWith([entry('m', 'motor', { energized: true, intensity: 0.7 })])
    );

    expect(dim.driveMotor).toBe(false);
    expect(bright.driveMotor).toBe(true);
    expect(DRIVE_MOTOR_INTENSITY_THRESHOLD).toBe(0.5);
  });

  it('does not count an element of the wrong kind towards a role', () => {
    const activation = evaluateRoleActivation(
      MARS_ROVER,
      resultWith([entry('b', 'buzzer', { energized: true, intensity: 1 })])
    );
    expect(activation.headlight).toBe(false);
    expect(activation.buzzerAlert).toBe(true);
  });

  it('resolves an unknown activation rule to false instead of throwing', () => {
    const rogue: TargetMachine = {
      id: 'rogue',
      roles: [
        {
          roleId: 'mystery',
          requiredKind: 'motor',
          activationRule: 'doesNotExist',
          presentationKey: 'x',
        },
      ],
    };
    const activation = evaluateRoleActivation(
      rogue,
      resultWith([entry('m', 'motor', { energized: true, intensity: 1 })])
    );

    expect(activation).toEqual({ mystery: false });
  });

  it('does not treat an inherited property name as an activation rule', () => {
    const rogue: TargetMachine = {
      id: 'rogue',
      roles: [
        {
          roleId: 'mystery',
          requiredKind: 'motor',
          activationRule: 'toString',
          presentationKey: 'x',
        },
      ],
    };
    expect(evaluateRoleActivation(rogue, resultWith([]))).toEqual({ mystery: false });
  });
});

describe('ROLE_ACTIVATION_RULES', () => {
  it('treats a solar panel as charging only while current flows', () => {
    const rule = ROLE_ACTIVATION_RULES.sourceDelivering;
    expect(rule?.({ matching: [entry('s', 'solar', { current: -0.1 })] })).toBe(true);
    expect(rule?.({ matching: [entry('s', 'solar', { current: 0 })] })).toBe(false);
  });
});
