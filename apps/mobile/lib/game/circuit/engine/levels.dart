import 'types.dart';

CircuitElement _pre(ElementKind kind, String id, int col, int row) =>
    createElement(kind, id: id, position: GridPosition(col, row));

LevelDefinition _guided({
  required String id,
  required int difficulty,
  required NumericDisclosure disclosure,
  required int cols,
  required int rows,
  required Map<ElementKind, int> available,
  required List<CircuitElement> prePlaced,
  required String successConditionId,
  required String conceptTag,
}) =>
    LevelDefinition(
      id: id,
      difficulty: difficulty,
      numericDisclosure: disclosure,
      gridSize: GridSize(cols, rows),
      availableComponents: available,
      prePlaced: prePlaced,
      lockedElementIds: [for (final e in prePlaced) e.id],
      targetMachineId: 'mars-rover',
      successConditionId: successConditionId,
      conceptTag: conceptTag,
    );

const _b = ElementKind.battery;
const _bz = ElementKind.buzzer;
const _l = ElementKind.led;
const _m = ElementKind.motor;
const _r = ElementKind.resistor;
const _w = ElementKind.wire;

/// Level registry (web `levels.ts` + `guided-levels.ts`), keyed by id.
final Map<String, LevelDefinition> kLevels = Map.unmodifiable({
  for (final level in [
    _guided(
      id: 'cb-01-closed-circuit',
      difficulty: 1,
      disclosure: NumericDisclosure.none,
      cols: 8,
      rows: 6,
      available: {_b: 1, _w: 4, _l: 1, _r: 1},
      prePlaced: const [],
      successConditionId: 'rover-headlight-on',
      conceptTag: 'closed-circuit',
    ),
    _guided(
      id: 'cb-02-switch-control',
      difficulty: 1,
      disclosure: NumericDisclosure.none,
      cols: 8,
      rows: 6,
      available: {_b: 1, _r: 1, _l: 1, _w: 3},
      prePlaced: [_pre(ElementKind.switchKind, 'pre-switch', 3, 2)],
      successConditionId: 'rover-headlight-on',
      conceptTag: 'switch-control',
    ),
    _guided(
      id: 'cb-03-series-loop',
      difficulty: 2,
      disclosure: NumericDisclosure.qualitative,
      cols: 10,
      rows: 6,
      available: {_b: 1, _r: 1, _l: 1, _bz: 1, _w: 3},
      prePlaced: [_pre(ElementKind.switchKind, 'pre-switch', 4, 2)],
      successConditionId: 'rover-headlight-on',
      conceptTag: 'series-circuit',
    ),
    _guided(
      id: 'cb-04-parallel-branches',
      difficulty: 2,
      disclosure: NumericDisclosure.qualitative,
      cols: 10,
      rows: 7,
      available: {_b: 1, _r: 1, _l: 1, _bz: 1, _w: 2},
      prePlaced: [
        _pre(ElementKind.switchKind, 'pre-switch-led', 4, 1),
        _pre(ElementKind.switchKind, 'pre-switch-buzzer', 4, 5),
      ],
      successConditionId: 'rover-headlight-on',
      conceptTag: 'parallel-circuit',
    ),
    _guided(
      id: 'cb-05-series-vs-parallel',
      difficulty: 3,
      disclosure: NumericDisclosure.valuesTier,
      cols: 12,
      rows: 8,
      available: {_b: 1, _m: 2, _l: 1, _bz: 1, _r: 1, _w: 3},
      prePlaced: const [],
      successConditionId: 'rover-fully-powered',
      conceptTag: 'series-vs-parallel',
    ),
    _guided(
      id: 'cb-06-short-circuit-recovery',
      difficulty: 3,
      disclosure: NumericDisclosure.valuesTier,
      cols: 8,
      rows: 6,
      available: {_b: 1, _r: 1, _l: 1, _w: 4},
      prePlaced: const [],
      successConditionId: 'rover-headlight-on',
      conceptTag: 'short-circuit',
    ),
    _guided(
      id: 'cb-07-resistance-limits-current',
      difficulty: 4,
      disclosure: NumericDisclosure.full,
      cols: 10,
      rows: 6,
      available: {_r: 2, _w: 3},
      prePlaced: [_pre(_b, 'pre-battery', 1, 3), _pre(_l, 'pre-led', 8, 3)],
      successConditionId: 'rover-headlight-on',
      conceptTag: 'resistance-limits-current',
    ),
    _guided(
      id: 'cb-08-variable-voltage',
      difficulty: 4,
      disclosure: NumericDisclosure.full,
      cols: 12,
      rows: 8,
      available: {_b: 1, _m: 1, _l: 1, _bz: 1, _r: 1, _w: 3},
      prePlaced: [
        _pre(ElementKind.switchKind, 'pre-switch-master', 3, 4),
        _pre(ElementKind.switchKind, 'pre-switch-headlight', 7, 2),
      ],
      successConditionId: 'rover-fully-powered',
      conceptTag: 'variable-voltage',
    ),
    _guided(
      id: 'sandbox',
      difficulty: 4,
      disclosure: NumericDisclosure.full,
      cols: 24,
      rows: 16,
      available: {
        for (final k in ElementKind.values) k: 8,
      },
      prePlaced: const [],
      successConditionId: 'none',
      conceptTag: 'free-play',
    ),
  ])
    level.id: level,
});

LevelDefinition? getLevel(String id) => kLevels[id];

/// Every level sorted by id (web `listLevels`).
List<LevelDefinition> listLevels() => kLevels.values.toList()..sort((a, b) => a.id.compareTo(b.id));

/// Guided levels in curriculum (id) order: every level except the sandbox.
List<LevelDefinition> listGuidedLevels() => [
      for (final l in listLevels())
        if (l.id != 'sandbox' && l.successConditionId != 'none') l,
    ];

List<LevelDefinition> guidedLevelsForDifficulty(int difficulty) => [
      for (final l in listGuidedLevels())
        if (l.difficulty == difficulty) l
    ];

LevelDefinition? findGuidedLevel(String id) {
  for (final l in listGuidedLevels()) {
    if (l.id == id) return l;
  }
  return null;
}

LevelDefinition? nextGuidedLevel(String id) {
  final levels = listGuidedLevels();
  final index = levels.indexWhere((l) => l.id == id);
  if (index < 0 || index + 1 >= levels.length) return null;
  return levels[index + 1];
}

/// Clamp a client-reported fault count (web `clampFaultCount`).
FaultCountClamp clampFaultCount(int reported, LevelDefinition level) {
  if (reported < 0) return const FaultCountClamp(0, true, true);
  final ceiling = level.maxFaultCount ?? kMaxFaultCountPerLevel;
  if (reported > ceiling) return FaultCountClamp(ceiling, true, false);
  return FaultCountClamp(reported, false, false);
}
