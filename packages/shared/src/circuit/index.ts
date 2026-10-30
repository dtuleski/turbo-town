/**
 * Circuit Builder engine - public surface.
 *
 * `evaluate` is the only engine entry point other packages use. The netlist, topology,
 * matrix, solver, fault, and validation modules are deliberately not re-exported: the
 * approved design makes A5 the single symbol `services/game` imports, and a narrow surface is
 * what lets the internals change without breaking the shared contract. Their own tests import
 * them by relative path.
 *
 * The level model, success predicates, and machine registry are exported because both the
 * browser and the Game Service need them to agree on what counts as success.
 */

export * from './types';
export * from './constants';
export * from './builders';
export * from './evaluate';
export * from './levels';
export * from './machines';
export * from './success';
