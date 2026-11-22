import '../game/circuit/engine/engine.dart';
import '../game/circuit/state.dart';
import 'gen/app_localizations.dart';

/// Lookups for Circuit Builder strings whose key depends on data. gen-l10n makes one
/// getter per key, so the dynamic part is a switch. Generated from the ARB key list;
/// every key is a web locale key (apps/web/src/locales).

String componentName(AppLocalizations l, ElementKind kind) => switch (kind) {
      ElementKind.battery => l.circuitBuilder_component_battery_name,
      ElementKind.solar => l.circuitBuilder_component_solar_name,
      ElementKind.wire => l.circuitBuilder_component_wire_name,
      ElementKind.switchKind => l.circuitBuilder_component_switch_name,
      ElementKind.resistor => l.circuitBuilder_component_resistor_name,
      ElementKind.led => l.circuitBuilder_component_led_name,
      ElementKind.motor => l.circuitBuilder_component_motor_name,
      ElementKind.buzzer => l.circuitBuilder_component_buzzer_name,
    };

String componentAbbr(AppLocalizations l, ElementKind kind) => switch (kind) {
      ElementKind.battery => l.circuitBuilder_component_battery_abbr,
      ElementKind.solar => l.circuitBuilder_component_solar_abbr,
      ElementKind.wire => l.circuitBuilder_component_wire_abbr,
      ElementKind.switchKind => l.circuitBuilder_component_switch_abbr,
      ElementKind.resistor => l.circuitBuilder_component_resistor_abbr,
      ElementKind.led => l.circuitBuilder_component_led_abbr,
      ElementKind.motor => l.circuitBuilder_component_motor_abbr,
      ElementKind.buzzer => l.circuitBuilder_component_buzzer_abbr,
    };

String faultTitle(AppLocalizations l, FaultCode code) => switch (code) {
      FaultCode.shortCircuit => l.circuitBuilder_fault_SHORT_CIRCUIT,
      FaultCode.overcurrent => l.circuitBuilder_fault_OVERCURRENT,
      FaultCode.reversedPolarity => l.circuitBuilder_fault_REVERSED_POLARITY,
      FaultCode.singularSystem => l.circuitBuilder_fault_SINGULAR_SYSTEM,
    };

String faultHelp(AppLocalizations l, FaultCode code) => switch (code) {
      FaultCode.shortCircuit => l.circuitBuilder_faultHelp_SHORT_CIRCUIT,
      FaultCode.overcurrent => l.circuitBuilder_faultHelp_OVERCURRENT,
      FaultCode.reversedPolarity => l.circuitBuilder_faultHelp_REVERSED_POLARITY,
      FaultCode.singularSystem => l.circuitBuilder_faultHelp_SINGULAR_SYSTEM,
    };

String rejectionText(AppLocalizations l, RejectionCode code) => switch (code) {
      RejectionCode.outOfBounds => l.circuitBuilder_rejection_OUT_OF_BOUNDS,
      RejectionCode.cellOccupied => l.circuitBuilder_rejection_CELL_OCCUPIED,
      RejectionCode.overBudget => l.circuitBuilder_rejection_OVER_BUDGET,
      RejectionCode.elementLimit => l.circuitBuilder_rejection_ELEMENT_LIMIT,
      RejectionCode.connectionLimit => l.circuitBuilder_rejection_CONNECTION_LIMIT,
      RejectionCode.unknownElement => l.circuitBuilder_rejection_UNKNOWN_ELEMENT,
      RejectionCode.unknownConnection => l.circuitBuilder_rejection_UNKNOWN_CONNECTION,
      RejectionCode.elementLocked => l.circuitBuilder_rejection_ELEMENT_LOCKED,
      RejectionCode.notASwitch => l.circuitBuilder_rejection_NOT_A_SWITCH,
      RejectionCode.selfConnection => l.circuitBuilder_rejection_SELF_CONNECTION,
      RejectionCode.duplicateConnection => l.circuitBuilder_rejection_DUPLICATE_CONNECTION,
      RejectionCode.invalidVoltage => l.circuitBuilder_rejection_INVALID_VOLTAGE,
      RejectionCode.invalidLightLevel => l.circuitBuilder_rejection_INVALID_LIGHT_LEVEL,
    };

/// Level title (web `circuitBuilder.level.<id>.title`); the id itself for an unknown level.
String levelTitle(AppLocalizations l, String levelId) => switch (levelId) {
      'cb-01-closed-circuit' => l.circuitBuilder_level_cb_01_closed_circuit_title,
      'cb-02-switch-control' => l.circuitBuilder_level_cb_02_switch_control_title,
      'cb-03-series-loop' => l.circuitBuilder_level_cb_03_series_loop_title,
      'cb-04-parallel-branches' => l.circuitBuilder_level_cb_04_parallel_branches_title,
      'cb-05-series-vs-parallel' => l.circuitBuilder_level_cb_05_series_vs_parallel_title,
      'cb-06-short-circuit-recovery' => l.circuitBuilder_level_cb_06_short_circuit_recovery_title,
      'cb-07-resistance-limits-current' =>
        l.circuitBuilder_level_cb_07_resistance_limits_current_title,
      'cb-08-variable-voltage' => l.circuitBuilder_level_cb_08_variable_voltage_title,
      _ => levelId,
    };

/// Level goal (web `circuitBuilder.level.<id>.goal`); the id itself for an unknown level.
String levelGoal(AppLocalizations l, String levelId) => switch (levelId) {
      'cb-01-closed-circuit' => l.circuitBuilder_level_cb_01_closed_circuit_goal,
      'cb-02-switch-control' => l.circuitBuilder_level_cb_02_switch_control_goal,
      'cb-03-series-loop' => l.circuitBuilder_level_cb_03_series_loop_goal,
      'cb-04-parallel-branches' => l.circuitBuilder_level_cb_04_parallel_branches_goal,
      'cb-05-series-vs-parallel' => l.circuitBuilder_level_cb_05_series_vs_parallel_goal,
      'cb-06-short-circuit-recovery' => l.circuitBuilder_level_cb_06_short_circuit_recovery_goal,
      'cb-07-resistance-limits-current' =>
        l.circuitBuilder_level_cb_07_resistance_limits_current_goal,
      'cb-08-variable-voltage' => l.circuitBuilder_level_cb_08_variable_voltage_goal,
      _ => levelId,
    };

/// Level hint (web `circuitBuilder.level.<id>.hint`); the id itself for an unknown level.
String levelHint(AppLocalizations l, String levelId) => switch (levelId) {
      'cb-01-closed-circuit' => l.circuitBuilder_level_cb_01_closed_circuit_hint,
      'cb-02-switch-control' => l.circuitBuilder_level_cb_02_switch_control_hint,
      'cb-03-series-loop' => l.circuitBuilder_level_cb_03_series_loop_hint,
      'cb-04-parallel-branches' => l.circuitBuilder_level_cb_04_parallel_branches_hint,
      'cb-05-series-vs-parallel' => l.circuitBuilder_level_cb_05_series_vs_parallel_hint,
      'cb-06-short-circuit-recovery' => l.circuitBuilder_level_cb_06_short_circuit_recovery_hint,
      'cb-07-resistance-limits-current' =>
        l.circuitBuilder_level_cb_07_resistance_limits_current_hint,
      'cb-08-variable-voltage' => l.circuitBuilder_level_cb_08_variable_voltage_hint,
      _ => levelId,
    };

/// Level learn (web `circuitBuilder.level.<id>.learn`); the id itself for an unknown level.
String levelLearn(AppLocalizations l, String levelId) => switch (levelId) {
      'cb-01-closed-circuit' => l.circuitBuilder_level_cb_01_closed_circuit_learn,
      'cb-02-switch-control' => l.circuitBuilder_level_cb_02_switch_control_learn,
      'cb-03-series-loop' => l.circuitBuilder_level_cb_03_series_loop_learn,
      'cb-04-parallel-branches' => l.circuitBuilder_level_cb_04_parallel_branches_learn,
      'cb-05-series-vs-parallel' => l.circuitBuilder_level_cb_05_series_vs_parallel_learn,
      'cb-06-short-circuit-recovery' => l.circuitBuilder_level_cb_06_short_circuit_recovery_learn,
      'cb-07-resistance-limits-current' =>
        l.circuitBuilder_level_cb_07_resistance_limits_current_learn,
      'cb-08-variable-voltage' => l.circuitBuilder_level_cb_08_variable_voltage_learn,
      _ => levelId,
    };

String difficultyName(AppLocalizations l, int difficulty) => switch (difficulty) {
      1 => l.circuitBuilder_difficulty_1_name,
      2 => l.circuitBuilder_difficulty_2_name,
      3 => l.circuitBuilder_difficulty_3_name,
      4 => l.circuitBuilder_difficulty_4_name,
      _ => '',
    };

String difficultySummary(AppLocalizations l, int difficulty) => switch (difficulty) {
      1 => l.circuitBuilder_difficulty_1_summary,
      2 => l.circuitBuilder_difficulty_2_summary,
      3 => l.circuitBuilder_difficulty_3_summary,
      4 => l.circuitBuilder_difficulty_4_summary,
      _ => '',
    };

String difficultyDisclosure(AppLocalizations l, int difficulty) => switch (difficulty) {
      1 => l.circuitBuilder_difficulty_1_disclosure,
      2 => l.circuitBuilder_difficulty_2_disclosure,
      3 => l.circuitBuilder_difficulty_3_disclosure,
      4 => l.circuitBuilder_difficulty_4_disclosure,
      _ => '',
    };

String difficultyLevels(AppLocalizations l, int difficulty, int count) => switch (difficulty) {
      1 => l.circuitBuilder_difficulty_1_levels('$count'),
      2 => l.circuitBuilder_difficulty_2_levels('$count'),
      3 => l.circuitBuilder_difficulty_3_levels('$count'),
      4 => l.circuitBuilder_difficulty_4_levels('$count'),
      _ => '',
    };

/// Rover role label from the machine's presentation key.
String roverRoleLabel(AppLocalizations l, String presentationKey) => switch (presentationKey) {
      'circuitBuilder.machine.marsRover.driveMotor' =>
        l.circuitBuilder_machine_marsRover_driveMotor,
      'circuitBuilder.machine.marsRover.headlight' => l.circuitBuilder_machine_marsRover_headlight,
      'circuitBuilder.machine.marsRover.buzzerAlert' =>
        l.circuitBuilder_machine_marsRover_buzzerAlert,
      'circuitBuilder.machine.marsRover.solarCharging' =>
        l.circuitBuilder_machine_marsRover_solarCharging,
      _ => presentationKey,
    };
