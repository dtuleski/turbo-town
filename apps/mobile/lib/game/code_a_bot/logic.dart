/// Port of apps/web `utils/codeABotUtils.ts`: levels, and the simulation that
/// runs a program of instruction blocks on a level.
enum Direction { up, right, down, left }

enum Instruction { forward, turnLeft, turnRight, jump }

enum CellType { empty, start, goal, wall, crack, ice }

class Position {
  const Position(this.row, this.col);
  final int row;
  final int col;

  Position operator +(Position o) => Position(row + o.row, col + o.col);

  @override
  bool operator ==(Object other) => other is Position && other.row == row && other.col == col;

  @override
  int get hashCode => Object.hash(row, col);

  @override
  String toString() => '($row,$col)';
}

class BotLevel {
  const BotLevel({
    required this.grid,
    required this.rows,
    required this.cols,
    required this.start,
    required this.startDir,
    required this.goal,
    required this.maxInstructions,
    required this.optimalSteps,
    required this.levelNumber,
    required this.hint,
  });

  final List<List<CellType>> grid;
  final int rows;
  final int cols;
  final Position start;
  final Direction startDir;
  final Position goal;
  final int maxInstructions;
  final int optimalSteps;
  final int levelNumber;

  /// English only, like web.
  final String hint;
}

class SimStep {
  const SimStep({
    required this.pos,
    required this.dir,
    required this.instruction,
    required this.alive,
    required this.reachedGoal,
    this.slid = false,
    this.jumped = false,
    this.fellInCrack = false,
  });

  final Position pos;
  final Direction dir;
  final Instruction instruction;
  final bool alive;
  final bool reachedGoal;

  /// Ice moved the bot one extra cell.
  final bool slid;
  final bool jumped;
  final bool fellInCrack;

  SimStep copyWith({Position? pos, bool? reachedGoal, bool? slid}) => SimStep(
        pos: pos ?? this.pos,
        dir: dir,
        instruction: instruction,
        alive: alive,
        reachedGoal: reachedGoal ?? this.reachedGoal,
        slid: slid ?? this.slid,
        jumped: jumped,
        fellInCrack: fellInCrack,
      );
}

class BotDifficulty {
  const BotDifficulty(this.id, this.gridSize, this.levelCount, this.hasCracks, this.hasIce);
  final String id;
  final int gridSize;
  final int levelCount;
  final bool hasCracks;
  final bool hasIce;
}

const List<BotDifficulty> kBotDifficulties = [
  BotDifficulty('easy', 5, 5, false, false),
  BotDifficulty('medium', 6, 5, true, false),
  BotDifficulty('hard', 7, 5, true, true),
];

BotDifficulty botDifficulty(String? id) =>
    kBotDifficulties.firstWhere((d) => d.id == id, orElse: () => kBotDifficulties.first);

int botDifficultyValue(String? id) => kBotDifficulties.indexOf(botDifficulty(id)) + 1;

const Map<Direction, Position> _delta = {
  Direction.up: Position(-1, 0),
  Direction.right: Position(0, 1),
  Direction.down: Position(1, 0),
  Direction.left: Position(0, -1),
};

const Map<Direction, Direction> _turnLeft = {
  Direction.up: Direction.left,
  Direction.left: Direction.down,
  Direction.down: Direction.right,
  Direction.right: Direction.up,
};

const Map<Direction, Direction> _turnRight = {
  Direction.up: Direction.right,
  Direction.right: Direction.down,
  Direction.down: Direction.left,
  Direction.left: Direction.up,
};

const Map<Direction, String> kDirArrow = {
  Direction.up: '▲',
  Direction.right: '▶',
  Direction.down: '▼',
  Direction.left: '◀',
};

bool _inBounds(Position p, BotLevel l) =>
    p.row >= 0 && p.row < l.rows && p.col >= 0 && p.col < l.cols;

({Position pos, bool alive}) _slideOnIce(Position pos, Direction dir, BotLevel level) {
  final next = pos + _delta[dir]!;
  if (!_inBounds(next, level) || level.grid[next.row][next.col] == CellType.wall) {
    return (pos: pos, alive: true); // stops at the edge
  }
  if (level.grid[next.row][next.col] == CellType.crack) return (pos: next, alive: false);
  return (pos: next, alive: true);
}

/// Runs [program] on [level] and returns one step per instruction executed
/// (the run stops at a crash, a crack or the goal).
List<SimStep> simulate(BotLevel level, List<Instruction> program) {
  final steps = <SimStep>[];
  var pos = level.start;
  var dir = level.startDir;
  for (final inst in program) {
    if (inst == Instruction.turnLeft || inst == Instruction.turnRight) {
      dir = (inst == Instruction.turnLeft ? _turnLeft : _turnRight)[dir]!;
      steps.add(SimStep(pos: pos, dir: dir, instruction: inst, alive: true, reachedGoal: false));
      continue;
    }
    final delta = _delta[dir]!;
    if (inst == Instruction.jump) {
      // A jump skips one cell and lands on the next.
      final land = pos + delta + delta;
      if (!_inBounds(land, level) || level.grid[land.row][land.col] == CellType.wall) {
        steps.add(SimStep(pos: pos, dir: dir, instruction: inst, alive: false, reachedGoal: false));
        return steps;
      }
      pos = land;
      final landed = level.grid[pos.row][pos.col];
      if (landed == CellType.crack) {
        steps.add(SimStep(
            pos: pos, dir: dir, instruction: inst, alive: false, reachedGoal: false, fellInCrack: true));
        return steps;
      }
      final reached = pos == level.goal;
      steps.add(SimStep(
          pos: pos, dir: dir, instruction: inst, alive: true, reachedGoal: reached, jumped: true));
      if (reached) return steps;
      if (landed == CellType.ice) {
        final slide = _slideOnIce(pos, dir, level);
        pos = slide.pos;
        if (!slide.alive) {
          steps.add(SimStep(
              pos: pos, dir: dir, instruction: inst, alive: false, reachedGoal: false, slid: true));
          return steps;
        }
        if (pos == level.goal) {
          steps[steps.length - 1] = steps.last.copyWith(pos: pos, reachedGoal: true, slid: true);
          return steps;
        }
      }
      continue;
    }
    // Forward.
    final next = pos + delta;
    if (!_inBounds(next, level) || level.grid[next.row][next.col] == CellType.wall) {
      steps.add(SimStep(pos: pos, dir: dir, instruction: inst, alive: false, reachedGoal: false));
      return steps;
    }
    pos = next;
    final cell = level.grid[pos.row][pos.col];
    if (cell == CellType.crack) {
      steps.add(SimStep(
          pos: pos, dir: dir, instruction: inst, alive: false, reachedGoal: false, fellInCrack: true));
      return steps;
    }
    final reached = pos == level.goal;
    steps.add(SimStep(pos: pos, dir: dir, instruction: inst, alive: true, reachedGoal: reached));
    if (reached) return steps;
    if (cell == CellType.ice) {
      final slide = _slideOnIce(pos, dir, level);
      pos = slide.pos;
      if (!slide.alive) {
        steps.add(SimStep(
            pos: pos, dir: dir, instruction: inst, alive: false, reachedGoal: false, slid: true));
        return steps;
      }
      steps[steps.length - 1] = steps.last.copyWith(pos: pos, slid: true);
      if (pos == level.goal) {
        steps[steps.length - 1] = steps.last.copyWith(reachedGoal: true);
        return steps;
      }
    }
  }
  return steps;
}

// ── Levels (hand-made, same as web) ───────────────────────────────────────

class _Spec {
  const _Spec(
    this.size,
    this.start,
    this.startDir,
    this.goal,
    this.max,
    this.optimal,
    this.hint, {
    this.walls = const [],
    this.cracks = const [],
    this.ice = const [],
  });
  final int size;
  final Position start;
  final Direction startDir;
  final Position goal;
  final int max;
  final int optimal;
  final String hint;
  final List<Position> walls;
  final List<Position> cracks;
  final List<Position> ice;
}

const _easy = [
  _Spec(5, Position(4, 0), Direction.up, Position(0, 0), 6, 4, 'Go straight up!'),
  _Spec(5, Position(2, 0), Direction.right, Position(2, 4), 6, 4, 'Head right through the corridor',
      walls: [Position(1, 1), Position(1, 2), Position(1, 3), Position(3, 1), Position(3, 2), Position(3, 3)]),
  _Spec(5, Position(4, 0), Direction.up, Position(0, 2), 8, 7, 'Go up, turn right, then forward',
      walls: [Position(2, 1), Position(3, 1)]),
  _Spec(5, Position(4, 0), Direction.up, Position(0, 4), 12, 10, 'Navigate around the walls',
      walls: [Position(3, 1), Position(2, 1), Position(1, 3), Position(2, 3)]),
  _Spec(5, Position(4, 0), Direction.up, Position(2, 2), 12, 9, 'Find the path to the center',
      walls: [
        Position(0, 1), Position(0, 2), Position(0, 3),
        Position(2, 0), Position(2, 1),
        Position(3, 3), Position(3, 4),
      ]),
];

const _medium = [
  _Spec(6, Position(5, 0), Direction.up, Position(0, 0), 8, 5, 'Jump over the crack!',
      cracks: [Position(3, 0)]),
  _Spec(6, Position(5, 0), Direction.up, Position(0, 5), 14, 11, 'Jump over cracks, navigate around walls',
      cracks: [Position(3, 0), Position(1, 3)], walls: [Position(2, 2), Position(3, 2)]),
  _Spec(6, Position(5, 0), Direction.right, Position(5, 5), 10, 5, 'Jump the crack and keep going',
      cracks: [Position(5, 2)],
      walls: [Position(3, 0), Position(3, 1), Position(3, 3), Position(3, 4), Position(3, 5)]),
  _Spec(6, Position(5, 0), Direction.up, Position(0, 5), 16, 13, 'Weave through walls and jump cracks',
      walls: [
        Position(4, 1), Position(3, 1), Position(2, 1),
        Position(2, 3), Position(3, 3), Position(4, 3),
      ],
      cracks: [Position(1, 2), Position(4, 4)]),
  _Spec(6, Position(5, 2), Direction.up, Position(0, 3), 14, 9, 'Two jumps and a turn',
      cracks: [Position(3, 2), Position(1, 2)],
      walls: [Position(2, 0), Position(2, 1), Position(4, 4), Position(4, 5)]),
];

const _hard = [
  _Spec(7, Position(6, 0), Direction.right, Position(6, 6), 8, 5, 'Ice slides you one extra cell!',
      ice: [Position(6, 3)]),
  _Spec(7, Position(6, 0), Direction.up, Position(0, 6), 14, 10, 'Use ice to your advantage, jump the crack',
      ice: [Position(4, 0), Position(0, 3)],
      cracks: [Position(2, 0)],
      walls: [Position(3, 3), Position(3, 4), Position(3, 5)]),
  _Spec(7, Position(6, 0), Direction.right, Position(0, 6), 18, 14, 'Plan around ice slides and cracks',
      ice: [Position(6, 2), Position(4, 4), Position(2, 6)],
      cracks: [Position(4, 2), Position(2, 4)],
      walls: [Position(3, 1), Position(3, 2), Position(1, 4), Position(1, 5)]),
  _Spec(7, Position(6, 3), Direction.up, Position(0, 3), 16, 7, 'Jump the crack, ride the ice',
      walls: [
        Position(5, 1), Position(5, 2), Position(5, 4), Position(5, 5),
        Position(3, 0), Position(3, 1), Position(3, 5), Position(3, 6),
        Position(1, 2), Position(1, 4),
      ],
      cracks: [Position(4, 3)],
      ice: [Position(2, 3)]),
  _Spec(7, Position(6, 0), Direction.up, Position(0, 6), 20, 15, 'The ultimate test of logic!',
      ice: [Position(5, 2), Position(3, 4), Position(1, 6)],
      cracks: [Position(4, 1), Position(2, 5)],
      walls: [
        Position(4, 3), Position(4, 4),
        Position(2, 1), Position(2, 2),
        Position(0, 3), Position(0, 4),
      ]),
];

/// Level [levelNumber] (1-based, clamped to the last) of [difficulty].
BotLevel getLevel(String difficulty, int levelNumber) {
  final specs = switch (difficulty) {
    'medium' => _medium,
    'hard' => _hard,
    _ => _easy,
  };
  final s = specs[(levelNumber - 1).clamp(0, specs.length - 1)];
  final grid = List.generate(s.size, (_) => List.filled(s.size, CellType.empty));
  void mark(Iterable<Position> ps, CellType t) {
    for (final p in ps) {
      grid[p.row][p.col] = t;
    }
  }

  mark([s.start], CellType.start);
  mark([s.goal], CellType.goal);
  mark(s.walls, CellType.wall);
  mark(s.cracks, CellType.crack);
  mark(s.ice, CellType.ice);
  return BotLevel(
    grid: grid,
    rows: s.size,
    cols: s.size,
    start: s.start,
    startDir: s.startDir,
    goal: s.goal,
    maxInstructions: s.max,
    optimalSteps: s.optimal,
    levelNumber: levelNumber,
    hint: s.hint,
  );
}

int getTotalLevels(String difficulty) => botDifficulty(difficulty).levelCount;
