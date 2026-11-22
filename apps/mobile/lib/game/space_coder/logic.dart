// Space Coder (web "scratch-coding"): commands, levels, program editing and the
// interpreter. Dart port of apps/web/src/utils/scratchCodingUtils.ts (the
// command-based "terminal" engine the game page uses). Pure; randomness is
// injected. Parity with the web is checked by test/fixtures/space_coder_golden.json.
import 'dart:math';

enum CellType { empty, wall, goal, obstacle }

enum Direction { up, right, down, left }

class Position {
  const Position(this.row, this.col);
  final int row;
  final int col;

  @override
  bool operator ==(Object other) => other is Position && other.row == row && other.col == col;
  @override
  int get hashCode => Object.hash(row, col);
  @override
  String toString() => '($row,$col)';
}

const Map<Direction, Position> kDirDelta = {
  Direction.up: Position(-1, 0),
  Direction.right: Position(0, 1),
  Direction.down: Position(1, 0),
  Direction.left: Position(0, -1),
};

const Map<Direction, Direction> kTurnLeft = {
  Direction.up: Direction.left,
  Direction.left: Direction.down,
  Direction.down: Direction.right,
  Direction.right: Direction.up,
};

const Map<Direction, Direction> kTurnRight = {
  Direction.up: Direction.right,
  Direction.right: Direction.down,
  Direction.down: Direction.left,
  Direction.left: Direction.up,
};

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

enum CommandType {
  forward('FORWARD'),
  turnLeft('TURN_LEFT'),
  turnRight('TURN_RIGHT'),
  jump('JUMP'),
  loop('LOOP'),
  ifCmd('IF'),
  whileCmd('WHILE'),
  varNumDecl('VAR_NUM_DECL'),
  varCharDecl('VAR_CHAR_DECL'),
  varNumInc('VAR_NUM_INC'),
  varNumDec('VAR_NUM_DEC');

  const CommandType(this.id);

  /// Web name (`FORWARD`).
  final String id;

  static CommandType? byId(String id) {
    for (final t in values) {
      if (t.id == id) return t;
    }
    return null;
  }
}

enum SensorType {
  obstacleAhead('obstacle-ahead'),
  atGoal('at-goal'),
  notAtGoal('not-at-goal'),
  edgeAhead('edge-ahead');

  const SensorType(this.id);
  final String id;
}

enum ComparisonOperator {
  lt('<'),
  gt('>'),
  eq('=');

  const ComparisonOperator(this.symbol);
  final String symbol;
}

enum Variable {
  num('var-num'),
  char('var-char');

  const Variable(this.id);
  final String id;
}

sealed class Condition {
  const Condition();
}

class SensorCondition extends Condition {
  const SensorCondition(this.sensor);
  final SensorType sensor;

  @override
  bool operator ==(Object other) => other is SensorCondition && other.sensor == sensor;
  @override
  int get hashCode => sensor.hashCode;
}

class ComparisonCondition extends Condition {
  const ComparisonCondition(this.variable, this.operator, this.value);
  final Variable variable;
  final ComparisonOperator operator;

  /// An int for `var-num`, a one-letter String for `var-char`.
  final Object value;

  ComparisonCondition copyWith({Variable? variable, ComparisonOperator? operator, Object? value}) =>
      ComparisonCondition(
          variable ?? this.variable, operator ?? this.operator, value ?? this.value);

  @override
  bool operator ==(Object other) =>
      other is ComparisonCondition &&
      other.variable == variable &&
      other.operator == operator &&
      other.value == value;
  @override
  int get hashCode => Object.hash(variable, operator, value);
}

/// One program command. Immutable; editing functions return new trees.
class Command {
  const Command({
    required this.id,
    required this.type,
    this.parameter,
    this.body,
    this.elseBody,
    this.condition,
    this.varValue,
  });

  final String id;
  final CommandType type;

  /// Loop count.
  final int? parameter;
  final List<Command>? body;
  final List<Command>? elseBody;
  final Condition? condition;

  /// Initial value of a variable declaration (int or one-letter String).
  final Object? varValue;

  Command copyWith({
    int? parameter,
    List<Command>? body,
    List<Command>? elseBody,
    Condition? condition,
    Object? varValue,
  }) =>
      Command(
        id: id,
        type: type,
        parameter: parameter ?? this.parameter,
        body: body ?? this.body,
        elseBody: elseBody ?? this.elseBody,
        condition: condition ?? this.condition,
        varValue: varValue ?? this.varValue,
      );
}

class CommandDefinition {
  const CommandDefinition(
    this.type,
    this.text, {
    this.isControlStructure = false,
    this.hasParameter = false,
    this.parameterDefault = 0,
    this.parameterMin = 0,
    this.parameterMax = 0,
    this.hasBody = false,
    this.hasElseBody = false,
    required this.minDifficulty,
  });
  final CommandType type;

  /// Text shown on the palette button (web `textRepresentation`).
  final String text;
  final bool isControlStructure;
  final bool hasParameter;
  final int parameterDefault;
  final int parameterMin;
  final int parameterMax;
  final bool hasBody;
  final bool hasElseBody;
  final String minDifficulty;
}

const List<CommandDefinition> kCommandDefinitions = [
  CommandDefinition(CommandType.forward, 'forward()', minDifficulty: 'easy'),
  CommandDefinition(CommandType.turnLeft, 'turn-left()', minDifficulty: 'easy'),
  CommandDefinition(CommandType.turnRight, 'turn-right()', minDifficulty: 'easy'),
  CommandDefinition(CommandType.jump, 'jump()', minDifficulty: 'hard'),
  CommandDefinition(CommandType.loop, 'loop(n)',
      isControlStructure: true,
      hasParameter: true,
      parameterDefault: 2,
      parameterMin: 1,
      parameterMax: 20,
      hasBody: true,
      minDifficulty: 'medium'),
  CommandDefinition(CommandType.ifCmd, 'if(...)',
      isControlStructure: true, hasBody: true, hasElseBody: true, minDifficulty: 'hard'),
  CommandDefinition(CommandType.whileCmd, 'while(...)',
      isControlStructure: true, hasBody: true, minDifficulty: 'hard'),
  CommandDefinition(CommandType.varNumDecl, 'var-num = 0', minDifficulty: 'hard'),
  CommandDefinition(CommandType.varCharDecl, "var-char = 'a'", minDifficulty: 'hard'),
  CommandDefinition(CommandType.varNumInc, 'var-num++', minDifficulty: 'hard'),
  CommandDefinition(CommandType.varNumDec, 'var-num--', minDifficulty: 'hard'),
];

CommandDefinition definitionOf(CommandType type) =>
    kCommandDefinitions.firstWhere((d) => d.type == type);

const Map<String, int> _difficultyRank = {'easy': 1, 'medium': 2, 'hard': 3};

const List<String> kSpaceCoderDifficulties = ['easy', 'medium', 'hard'];

/// Commands on the palette at [difficulty] (unknown reads as easy).
List<CommandDefinition> commandsForDifficulty(String difficulty) {
  final rank = _difficultyRank[difficulty] ?? 1;
  return [
    for (final d in kCommandDefinitions)
      if (_difficultyRank[d.minDifficulty]! <= rank) d
  ];
}

const Set<CommandType> kVariableCommands = {
  CommandType.varNumDecl,
  CommandType.varCharDecl,
  CommandType.varNumInc,
  CommandType.varNumDec,
};

/// Server difficulty value (web: easy 1, medium 2, hard 3).
int spaceCoderDifficultyValue(String difficulty) => switch (difficulty) {
      'medium' => 2,
      'hard' => 3,
      _ => 1,
    };

/// Program-unique ids. Web uses `crypto.randomUUID`; any unique string works.
class CommandIds {
  int _next = 0;
  String next() => 'cmd-${++_next}';
}

/// A new command with the web defaults (loop 2, if obstacle-ahead, while
/// not-at-goal, var-num 0, var-char 'a').
Command createCommand(CommandType type, String id) {
  final def = definitionOf(type);
  return switch (type) {
    CommandType.ifCmd => Command(
        id: id,
        type: type,
        condition: const SensorCondition(SensorType.obstacleAhead),
        body: const [],
        elseBody: const [],
      ),
    CommandType.whileCmd => Command(
        id: id,
        type: type,
        condition: const SensorCondition(SensorType.notAtGoal),
        body: const [],
      ),
    CommandType.varNumDecl => Command(id: id, type: type, varValue: 0),
    CommandType.varCharDecl => Command(id: id, type: type, varValue: 'a'),
    _ => Command(
        id: id,
        type: type,
        parameter: def.hasParameter ? def.parameterDefault : null,
        body: def.hasBody ? const [] : null,
        elseBody: def.hasElseBody ? const [] : null,
      ),
  };
}

// ---------------------------------------------------------------------------
// Text form and line accounting
// ---------------------------------------------------------------------------

String conditionToText(Condition c) => switch (c) {
      SensorCondition(:final sensor) => '${sensor.id}()',
      ComparisonCondition(:final variable, :final operator, :final value) =>
        '${variable.id} ${operator.symbol} $value',
    };

/// Indented text lines (two spaces per level), as the editor shows them.
List<String> programToText(List<Command> program, [int indent = 0]) {
  final lines = <String>[];
  final prefix = ' ' * indent;
  for (final cmd in program) {
    switch (cmd.type) {
      case CommandType.loop:
        lines.add('${prefix}loop(${cmd.parameter ?? 2})');
        lines.addAll(programToText(cmd.body ?? const [], indent + 2));
        lines.add('${prefix}next');
      case CommandType.ifCmd:
        final cond = cmd.condition == null ? 'obstacle-ahead()' : conditionToText(cmd.condition!);
        lines.add('${prefix}if($cond)');
        lines.addAll(programToText(cmd.body ?? const [], indent + 2));
        lines.add('${prefix}else');
        lines.addAll(programToText(cmd.elseBody ?? const [], indent + 2));
        lines.add('${prefix}end-if');
      case CommandType.whileCmd:
        final cond = cmd.condition == null ? 'not-at-goal()' : conditionToText(cmd.condition!);
        lines.add('${prefix}while($cond)');
        lines.addAll(programToText(cmd.body ?? const [], indent + 2));
        lines.add('${prefix}end-while');
      case CommandType.varNumDecl:
        lines.add('${prefix}var-num = ${cmd.varValue ?? 0}');
      case CommandType.varCharDecl:
        lines.add("${prefix}var-char = '${cmd.varValue ?? 'a'}'");
      case CommandType.varNumInc:
        lines.add('${prefix}var-num++');
      case CommandType.varNumDec:
        lines.add('${prefix}var-num--');
      default:
        lines.add('$prefix${definitionOf(cmd.type).text}');
    }
  }
  return lines;
}

int countAllLines(List<Command> commands) {
  var count = 0;
  for (final cmd in commands) {
    count += switch (cmd.type) {
      CommandType.loop || CommandType.whileCmd => 2 + countAllLines(cmd.body ?? const []),
      CommandType.ifCmd =>
        3 + countAllLines(cmd.body ?? const []) + countAllLines(cmd.elseBody ?? const []),
      _ => 1,
    };
  }
  return count;
}

enum Branch { body, elseBody }

/// Where the next command goes: inside [parentId]'s [branch] (null = top level), at [index].
class InsertionCursor {
  const InsertionCursor({this.parentId, this.branch = Branch.body, this.index = 0});
  final String? parentId;
  final Branch branch;
  final int index;

  @override
  bool operator ==(Object other) =>
      other is InsertionCursor &&
      other.parentId == parentId &&
      other.branch == branch &&
      other.index == index;
  @override
  int get hashCode => Object.hash(parentId, branch, index);
  @override
  String toString() => 'Cursor($parentId, ${branch.name}, $index)';
}

enum LineType { opening, closing, elseLine, simple }

class LineMapping {
  const LineMapping(
      this.lineIndex, this.command, this.parentId, this.branch, this.indexInParent, this.lineType);
  final int lineIndex;
  final Command command;

  /// The control structure that holds [command], or null at the top level.
  final String? parentId;
  final Branch branch;
  final int indexInParent;
  final LineType lineType;
}

List<LineMapping> buildLineMapping(List<Command> commands) {
  final out = <LineMapping>[];
  var line = 0;
  void walk(List<Command> cmds, String? parentId, Branch branch) {
    for (var i = 0; i < cmds.length; i++) {
      final cmd = cmds[i];
      switch (cmd.type) {
        case CommandType.loop:
        case CommandType.whileCmd:
          out.add(LineMapping(line++, cmd, parentId, branch, i, LineType.opening));
          walk(cmd.body ?? const [], cmd.id, Branch.body);
          out.add(LineMapping(line++, cmd, parentId, branch, i, LineType.closing));
        case CommandType.ifCmd:
          out.add(LineMapping(line++, cmd, parentId, branch, i, LineType.opening));
          walk(cmd.body ?? const [], cmd.id, Branch.body);
          out.add(LineMapping(line++, cmd, parentId, branch, i, LineType.elseLine));
          walk(cmd.elseBody ?? const [], cmd.id, Branch.elseBody);
          out.add(LineMapping(line++, cmd, parentId, branch, i, LineType.closing));
        default:
          out.add(LineMapping(line++, cmd, parentId, branch, i, LineType.simple));
      }
    }
  }

  walk(commands, null, Branch.body);
  return out;
}

/// The array [cursor] points into, rebuilt with [edit] applied; null when the
/// parent is gone.
List<Command>? _editAt(
  List<Command> commands,
  String? parentId,
  Branch branch,
  List<Command> Function(List<Command>) edit,
) {
  if (parentId == null) return edit(commands);
  var found = false;
  List<Command> walk(List<Command> cmds) => [
        for (final c in cmds)
          if (c.id == parentId &&
              !found &&
              (branch == Branch.elseBody ? c.elseBody : c.body) != null)
            () {
              found = true;
              return branch == Branch.elseBody
                  ? c.copyWith(elseBody: edit(c.elseBody!))
                  : c.copyWith(body: edit(c.body!));
            }()
          else if (c.body != null || c.elseBody != null)
            c.copyWith(
              body: c.body == null ? null : walk(c.body!),
              elseBody: c.elseBody == null ? null : walk(c.elseBody!),
            )
          else
            c,
      ];
  final result = walk(commands);
  return found ? result : null;
}

/// Inserts [cmd] at [cursor]. A control structure moves the cursor into its
/// body; anything else advances it. A cursor whose parent is gone inserts at
/// the top level (web fallback).
({List<Command> program, InsertionCursor cursor}) insertCommand(
  List<Command> program,
  Command cmd,
  InsertionCursor cursor,
) {
  final isControl = definitionOf(cmd.type).isControlStructure;
  var inserted = 0;
  List<Command> put(List<Command> target) {
    final at = cursor.index.clamp(0, target.length);
    inserted = at;
    return [...target]..insert(at, cmd);
  }

  final edited = _editAt(program, cursor.parentId, cursor.branch, put);
  if (edited == null) {
    final top = put(program);
    return (
      program: top,
      cursor: isControl
          ? InsertionCursor(parentId: cmd.id)
          : InsertionCursor(parentId: cursor.parentId, branch: cursor.branch, index: inserted + 1),
    );
  }
  return (
    program: edited,
    cursor: isControl
        ? InsertionCursor(parentId: cmd.id)
        : InsertionCursor(parentId: cursor.parentId, branch: cursor.branch, index: inserted + 1),
  );
}

/// Removes what line [lineIndex] shows: a simple command, or the whole control
/// structure for its opening, else or closing line. The cursor goes where the
/// removed item was.
({List<Command> program, InsertionCursor cursor}) removeAtLine(
  List<Command> program,
  int lineIndex,
) {
  final mapping = buildLineMapping(program).where((m) => m.lineIndex == lineIndex).firstOrNull;
  if (mapping == null) return (program: program, cursor: const InsertionCursor());
  final edited = _editAt(
        program,
        mapping.parentId,
        mapping.branch,
        (target) => [...target]..removeAt(mapping.indexInParent),
      ) ??
      program;
  // Web quirk kept for parity: after removing a simple command the web looks its
  // parent up in the tree it was just removed from, finds none, and so puts the
  // cursor at the top level (same index). A removed structure keeps its parent.
  final simple = mapping.lineType == LineType.simple;
  return (
    program: edited,
    cursor: InsertionCursor(
      parentId: simple ? null : mapping.parentId,
      branch: simple ? Branch.body : mapping.branch,
      index: mapping.indexInParent,
    ),
  );
}

/// Where tapping line [lineIndex] puts the cursor: inside a structure for its
/// opening or else line, after it for its closing line, after a simple command.
InsertionCursor? cursorForLine(List<Command> program, int lineIndex) {
  final m = buildLineMapping(program).where((m) => m.lineIndex == lineIndex).firstOrNull;
  if (m == null) return null;
  return switch (m.lineType) {
    LineType.opening => InsertionCursor(parentId: m.command.id),
    LineType.elseLine => InsertionCursor(parentId: m.command.id, branch: Branch.elseBody),
    _ => InsertionCursor(parentId: m.parentId, branch: m.branch, index: m.indexInParent + 1),
  };
}

/// The line the cursor marker sits before (equal to the line count at the end).
int cursorLinePosition(List<Command> program, InsertionCursor cursor) {
  final mappings = buildLineMapping(program);
  final total = mappings.length;
  if (total == 0) return 0;
  if (cursor.parentId == null) {
    if (cursor.index >= program.length) return total;
    final target = program[cursor.index].id;
    return mappings.firstWhere((m) => m.command.id == target).lineIndex;
  }
  final own = mappings.where((m) => m.command.id == cursor.parentId).toList();
  if (own.isEmpty) return total;
  final parent = own.first.command;
  final children =
      (cursor.branch == Branch.elseBody ? parent.elseBody : parent.body) ?? const <Command>[];
  if (cursor.index < children.length) {
    final target = children[cursor.index].id;
    return mappings.firstWhere((m) => m.command.id == target).lineIndex;
  }
  // After the last child: before the else line (if-body) or the closing line.
  if (cursor.branch == Branch.body && parent.type == CommandType.ifCmd) {
    return own.firstWhere((m) => m.lineType == LineType.elseLine).lineIndex;
  }
  return own.firstWhere((m) => m.lineType == LineType.closing).lineIndex;
}

/// Replaces the command with [id] anywhere in the tree.
List<Command> updateCommand(List<Command> program, String id, Command Function(Command) update) => [
      for (final c in program)
        if (c.id == id)
          update(c)
        else if (c.body != null || c.elseBody != null)
          c.copyWith(
            body: c.body == null ? null : updateCommand(c.body!, id, update),
            elseBody: c.elseBody == null ? null : updateCommand(c.elseBody!, id, update),
          )
        else
          c,
    ];

Command? findCommand(List<Command> program, String id) {
  for (final c in program) {
    if (c.id == id) return c;
    final inner = findCommand(c.body ?? const [], id) ?? findCommand(c.elseBody ?? const [], id);
    if (inner != null) return inner;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

class SpaceLevel {
  const SpaceLevel({
    required this.grid,
    required this.start,
    required this.startDir,
    required this.goal,
    required this.maxLines,
    required this.optimalLines,
    required this.levelNumber,
    required this.hint,
    this.obstacleCount,
  });
  final List<List<CellType>> grid;
  final Position start;
  final Direction startDir;
  final Position goal;
  final int maxLines;
  final int optimalLines;
  final int levelNumber;

  /// Locale key suffix (`easy1` for `scratchCoding.hints.easy1`).
  final String hint;

  /// Set on hard levels: obstacles are placed at random when the level loads.
  final int? obstacleCount;

  int get rows => grid.length;
  int get cols => grid.first.length;
  bool get generatesObstacles => obstacleCount != null;

  SpaceLevel withGrid(List<List<CellType>> g) => SpaceLevel(
        grid: g,
        start: start,
        startDir: startDir,
        goal: goal,
        maxLines: maxLines,
        optimalLines: optimalLines,
        levelNumber: levelNumber,
        hint: hint,
        obstacleCount: obstacleCount,
      );
}

List<List<CellType>> _parse(List<String> rows) => [
      for (final r in rows)
        [
          for (final ch in r.split(''))
            switch (ch) {
              '#' => CellType.wall,
              'G' => CellType.goal,
              'O' => CellType.obstacle,
              _ => CellType.empty,
            },
        ],
    ];

List<String> _emptyRows(int n, Position goal) => [
      for (var r = 0; r < n; r++)
        [for (var c = 0; c < n; c++) r == goal.row && c == goal.col ? 'G' : '.'].join(),
    ];

SpaceLevel _lv(List<String> rows, Position start, Direction dir, Position goal, int maxLines,
        int optimal, int n, String hint,
        {int? obstacles}) =>
    SpaceLevel(
      grid: _parse(rows),
      start: start,
      startDir: dir,
      goal: goal,
      maxLines: maxLines,
      optimalLines: optimal,
      levelNumber: n,
      hint: hint,
      obstacleCount: obstacles,
    );

final Map<String, List<SpaceLevel>> kSpaceLevels = {
  'easy': [
    _lv(['.....G', '......', '......', '......', '......', '......'], const Position(0, 0),
        Direction.right, const Position(0, 5), 9, 5, 1, 'easy1'),
    _lv(['......', '......', '...G..', '......', '......', '......'], const Position(0, 0),
        Direction.right, const Position(2, 3), 12, 6, 2, 'easy2'),
    _lv(['......', '####..', 'G.....', '......', '......', '......'], const Position(0, 0),
        Direction.right, const Position(2, 0), 16, 12, 3, 'easy3'),
    _lv(['......', '...#..', '....G.', '......', '......', '......'], const Position(0, 0),
        Direction.right, const Position(2, 4), 14, 8, 4, 'easy4'),
    _lv(['......', '####..', '......', '..####', 'G.....', '......'], const Position(0, 0),
        Direction.right, const Position(4, 0), 20, 15, 5, 'easy5'),
  ],
  'medium': [
    _lv([
      '........',
      '........',
      '........',
      '........',
      '........',
      '........',
      '......G.',
      '........'
    ], const Position(0, 0), Direction.right, const Position(6, 6), 12, 8, 1, 'medium1'),
    _lv([
      '........',
      '........',
      '.......G',
      '........',
      '........',
      '........',
      '........',
      '........'
    ], const Position(0, 0), Direction.right, const Position(2, 7), 14, 10, 2, 'medium2'),
    _lv([
      '........',
      '.######.',
      '.#....#.',
      '.#.##.#.',
      '.#....#.',
      '.#G...#.',
      '.######.',
      '........'
    ], const Position(0, 0), Direction.right, const Position(5, 2), 16, 10, 3, 'medium3'),
    _lv([
      '....####',
      '....####',
      '....####',
      '........',
      '####....',
      '####....',
      '####..G.',
      '########'
    ], const Position(0, 0), Direction.right, const Position(6, 6), 14, 10, 4, 'medium4'),
    _lv([
      '..######',
      '...#####',
      '....####',
      '.....###',
      '......##',
      '.......#',
      '......G.',
      '........'
    ], const Position(0, 0), Direction.right, const Position(6, 6), 10, 6, 5, 'medium5'),
  ],
  'hard': [
    _lv(_emptyRows(12, const Position(11, 11)), const Position(0, 0), Direction.right,
        const Position(11, 11), 30, 12, 1, 'hard1',
        obstacles: 10),
    _lv(_emptyRows(12, const Position(0, 11)), const Position(11, 0), Direction.up,
        const Position(0, 11), 35, 14, 2, 'hard2',
        obstacles: 12),
    _lv(_emptyRows(12, const Position(11, 0)), const Position(0, 6), Direction.down,
        const Position(11, 0), 35, 15, 3, 'hard3',
        obstacles: 15),
    _lv(_emptyRows(12, const Position(6, 11)), const Position(6, 0), Direction.right,
        const Position(6, 11), 30, 10, 4, 'hard4',
        obstacles: 18),
    _lv(_emptyRows(12, const Position(11, 11)), const Position(0, 0), Direction.down,
        const Position(11, 11), 25, 8, 5, 'hard5',
        obstacles: 20),
  ],
};

int totalSpaceLevels(String difficulty) =>
    (kSpaceLevels[difficulty] ?? kSpaceLevels['easy']!).length;

/// Level [n] (1-based) of [difficulty]; hard levels get random obstacles from [rng].
SpaceLevel loadSpaceLevel(String difficulty, int n, Random rng) {
  final levels = kSpaceLevels[difficulty] ?? kSpaceLevels['easy']!;
  final level = levels[(n - 1).clamp(0, levels.length - 1)];
  final count = level.obstacleCount;
  if (count == null || count == 0) return level;
  return level
      .withGrid(generateObstacles(level.rows, level.cols, level.start, level.goal, count, rng));
}

bool inBounds(Position p, SpaceLevel level) =>
    p.row >= 0 && p.row < level.rows && p.col >= 0 && p.col < level.cols;

/// BFS on the 4-connected grid; walls and obstacles block.
bool bfsPathExists(List<List<CellType>> grid, Position start, Position goal) {
  final rows = grid.length;
  if (rows == 0) return false;
  final cols = grid[0].length;
  if (start == goal) return true;
  bool outside(Position p) => p.row < 0 || p.row >= rows || p.col < 0 || p.col >= cols;
  if (outside(start) || outside(goal)) return false;
  final visited = List.generate(rows, (_) => List.filled(cols, false));
  final queue = <Position>[start];
  visited[start.row][start.col] = true;
  var head = 0;
  const deltas = [Position(-1, 0), Position(1, 0), Position(0, -1), Position(0, 1)];
  while (head < queue.length) {
    final cur = queue[head++];
    for (final d in deltas) {
      final nr = cur.row + d.row;
      final nc = cur.col + d.col;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || visited[nr][nc]) continue;
      final cell = grid[nr][nc];
      if (cell == CellType.wall || cell == CellType.obstacle) continue;
      if (nr == goal.row && nc == goal.col) return true;
      visited[nr][nc] = true;
      queue.add(Position(nr, nc));
    }
  }
  return false;
}

/// Random obstacles that always leave a path (web `generateObstacles`, same
/// candidate order and Fisher-Yates draws, so a seeded [rng] matches the web).
List<List<CellType>> generateObstacles(
  int rows,
  int cols,
  Position start,
  Position goal,
  int targetCount,
  Random rng,
) {
  final grid = List.generate(rows, (_) => List.filled(cols, CellType.empty));
  grid[goal.row][goal.col] = CellType.goal;
  final excluded = <Position>{start, goal};
  for (final d in const [Position(-1, 0), Position(1, 0), Position(0, -1), Position(0, 1)]) {
    final p = Position(start.row + d.row, start.col + d.col);
    if (p.row >= 0 && p.row < rows && p.col >= 0 && p.col < cols) excluded.add(p);
  }
  final candidates = <Position>[
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < cols; c++)
        if (!excluded.contains(Position(r, c))) Position(r, c),
  ];
  for (var i = candidates.length - 1; i > 0; i--) {
    final j = (rng.nextDouble() * (i + 1)).floor();
    final t = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = t;
  }
  var placed = 0;
  for (final p in candidates) {
    if (placed >= targetCount) break;
    grid[p.row][p.col] = CellType.obstacle;
    if (bfsPathExists(grid, start, goal)) {
      placed++;
    } else {
      grid[p.row][p.col] = CellType.empty;
    }
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Interpreter
// ---------------------------------------------------------------------------

enum ErrorType { collision, noObstacleToJump, infiniteLoop, jumpLandingBlocked, undefinedVariable }

class ExecutionStep {
  ExecutionStep({
    required this.commandId,
    required this.pos,
    required this.dir,
    required this.alive,
    required this.reachedGoal,
    this.hitWall = false,
    this.outOfBounds = false,
    this.hitObstacle = false,
    this.isJumpMidpoint = false,
    this.errorType,
    required this.lineIndex,
  });
  final String commandId;
  final Position pos;
  final Direction dir;
  bool alive;
  final bool reachedGoal;
  final bool hitWall;
  final bool outOfBounds;
  final bool hitObstacle;
  final bool isJumpMidpoint;
  ErrorType? errorType;

  /// Editor line of the command that made this step.
  final int lineIndex;
}

/// Most steps a run may take (web `MAX_STEPS`).
const int kMaxSteps = 500;
const int _maxWhileIterations = 1000;

/// Condition value, or null when it reads an undefined variable.
bool? evaluateCondition(
  Condition condition,
  Position pos,
  Direction dir,
  SpaceLevel level,
  Map<Variable, Object> env,
) {
  switch (condition) {
    case SensorCondition(:final sensor):
      final d = kDirDelta[dir]!;
      final ahead = Position(pos.row + d.row, pos.col + d.col);
      return switch (sensor) {
        SensorType.obstacleAhead => inBounds(ahead, level) &&
            (level.grid[ahead.row][ahead.col] == CellType.wall ||
                level.grid[ahead.row][ahead.col] == CellType.obstacle),
        SensorType.atGoal => pos == level.goal,
        SensorType.notAtGoal => pos != level.goal,
        SensorType.edgeAhead => !inBounds(ahead, level),
      };
    case ComparisonCondition(:final variable, :final operator, :final value):
      final current = env[variable];
      if (current == null) return null;
      final int a;
      final int b;
      if (variable == Variable.num) {
        a = current as int;
        b = value as int;
      } else {
        // Character comparison by the first code unit, like web charCodeAt(0).
        a = (current as String).codeUnitAt(0);
        b = (value as String).codeUnitAt(0);
      }
      return switch (operator) {
        ComparisonOperator.lt => a < b,
        ComparisonOperator.gt => a > b,
        ComparisonOperator.eq => a == b,
      };
  }
}

/// Runs [program] on [level] and returns every step for the animation (web
/// `executeProgramV2`).
List<ExecutionStep> executeProgram(SpaceLevel level, List<Command> program) {
  final steps = <ExecutionStep>[];
  var pos = level.start;
  var dir = level.startDir;
  var alive = true;
  final env = <Variable, Object>{};
  final lineOf = {
    for (final m in buildLineMapping(program))
      if (m.lineType != LineType.closing && m.lineType != LineType.elseLine)
        m.command.id: m.lineIndex,
  };

  bool isDone() =>
      !alive || (steps.isNotEmpty && steps.last.reachedGoal) || steps.length >= kMaxSteps;

  void push(
    String id, {
    bool? reachedGoal,
    bool hitWall = false,
    bool outOfBounds = false,
    bool hitObstacle = false,
    bool isJumpMidpoint = false,
    ErrorType? errorType,
  }) {
    steps.add(ExecutionStep(
      commandId: id,
      pos: pos,
      dir: dir,
      alive: alive,
      reachedGoal: reachedGoal ?? pos == level.goal,
      hitWall: hitWall,
      outOfBounds: outOfBounds,
      hitObstacle: hitObstacle,
      isJumpMidpoint: isJumpMidpoint,
      errorType: errorType,
      lineIndex: lineOf[id] ?? 0,
    ));
  }

  void exec(Command cmd) {
    if (isDone()) return;
    switch (cmd.type) {
      case CommandType.forward:
        final d = kDirDelta[dir]!;
        final next = Position(pos.row + d.row, pos.col + d.col);
        if (!inBounds(next, level)) {
          alive = false;
          push(cmd.id, outOfBounds: true, reachedGoal: false, errorType: ErrorType.collision);
          return;
        }
        final cell = level.grid[next.row][next.col];
        if (cell == CellType.wall) {
          alive = false;
          push(cmd.id, hitWall: true, reachedGoal: false, errorType: ErrorType.collision);
          return;
        }
        if (cell == CellType.obstacle) {
          alive = false;
          push(cmd.id, hitObstacle: true, reachedGoal: false, errorType: ErrorType.collision);
          return;
        }
        pos = next;
        push(cmd.id);
      case CommandType.turnLeft:
        dir = kTurnLeft[dir]!;
        push(cmd.id);
      case CommandType.turnRight:
        dir = kTurnRight[dir]!;
        push(cmd.id);
      case CommandType.jump:
        final d = kDirDelta[dir]!;
        final ahead = Position(pos.row + d.row, pos.col + d.col);
        final obstacleAhead =
            inBounds(ahead, level) && level.grid[ahead.row][ahead.col] == CellType.obstacle;
        if (!obstacleAhead) {
          alive = false;
          push(cmd.id, reachedGoal: false, errorType: ErrorType.noObstacleToJump);
          return;
        }
        final landing = Position(pos.row + d.row * 2, pos.col + d.col * 2);
        if (!inBounds(landing, level)) {
          alive = false;
          push(cmd.id,
              outOfBounds: true, reachedGoal: false, errorType: ErrorType.jumpLandingBlocked);
          return;
        }
        final cell = level.grid[landing.row][landing.col];
        if (cell == CellType.wall || cell == CellType.obstacle) {
          alive = false;
          push(cmd.id,
              hitWall: cell == CellType.wall,
              hitObstacle: cell == CellType.obstacle,
              reachedGoal: false,
              errorType: ErrorType.jumpLandingBlocked);
          return;
        }
        pos = ahead;
        push(cmd.id, isJumpMidpoint: true, reachedGoal: false);
        pos = landing;
        push(cmd.id);
      case CommandType.loop:
        final count = cmd.parameter ?? 2;
        for (var i = 0; i < count; i++) {
          for (final child in cmd.body ?? const <Command>[]) {
            exec(child);
            if (isDone()) return;
          }
        }
      case CommandType.ifCmd:
        final cond = cmd.condition ?? const SensorCondition(SensorType.obstacleAhead);
        final value = evaluateCondition(cond, pos, dir, level, env);
        if (value == null) {
          alive = false;
          push(cmd.id, reachedGoal: false, errorType: ErrorType.undefinedVariable);
          return;
        }
        for (final child in (value ? cmd.body : cmd.elseBody) ?? const <Command>[]) {
          exec(child);
          if (isDone()) return;
        }
      case CommandType.whileCmd:
        final cond = cmd.condition ?? const SensorCondition(SensorType.notAtGoal);
        var iterations = 0;
        while (!isDone()) {
          iterations++;
          if (iterations > _maxWhileIterations) {
            alive = false;
            push(cmd.id, reachedGoal: false, errorType: ErrorType.infiniteLoop);
            return;
          }
          final value = evaluateCondition(cond, pos, dir, level, env);
          if (value == null) {
            alive = false;
            push(cmd.id, reachedGoal: false, errorType: ErrorType.undefinedVariable);
            return;
          }
          if (!value) break;
          for (final child in cmd.body ?? const <Command>[]) {
            exec(child);
            if (isDone()) return;
          }
          if (steps.length >= kMaxSteps) {
            alive = false;
            push(cmd.id, reachedGoal: false, errorType: ErrorType.infiniteLoop);
            return;
          }
        }
      case CommandType.varNumDecl:
        env[Variable.num] = cmd.varValue ?? 0;
      case CommandType.varCharDecl:
        env[Variable.char] = cmd.varValue ?? 'a';
      case CommandType.varNumInc:
      case CommandType.varNumDec:
        final current = env[Variable.num];
        if (current == null) {
          alive = false;
          push(cmd.id, reachedGoal: false, errorType: ErrorType.undefinedVariable);
          return;
        }
        env[Variable.num] = (current as int) + (cmd.type == CommandType.varNumInc ? 1 : -1);
    }
  }

  for (final cmd in program) {
    exec(cmd);
    if (isDone()) break;
  }
  if (steps.length >= kMaxSteps && alive) {
    final last = steps.last;
    if (!last.reachedGoal && last.errorType != ErrorType.infiniteLoop) {
      last.alive = false;
      last.errorType = ErrorType.infiniteLoop;
    }
  }
  return steps;
}

/// min(1, sum(optimal) / sum(actual)); 1 when nothing was written.
double computeLineEfficiency(List<({int optimalLines, int actualLines})> results) {
  var optimal = 0;
  var actual = 0;
  for (final r in results) {
    optimal += r.optimalLines;
    actual += r.actualLines;
  }
  if (actual == 0) return 1;
  final e = optimal / actual;
  return e < 1 ? e : 1;
}
