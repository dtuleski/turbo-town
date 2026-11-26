/// Dart models for the Daily Challenge GraphQL types (M1). They mirror
/// packages/shared/src/challenge/types.ts and services/game/src/types/challenge.ts.
/// `settings` and `content` arrive as JSON text; anything malformed parses to
/// null, which the app treats as "no challenge".
library;

import 'dart:convert';

/// The content languages of word-based games, in the server's order.
const List<String> kChallengeLanguages = ['en', 'es', 'pt'];

/// The content language for an app language tag: its base code when
/// supported, else `en` (web `challengeLanguage`).
String challengeLanguage(String? tag) {
  final base = (tag ?? '').length >= 2 ? tag!.substring(0, 2).toLowerCase() : '';
  return kChallengeLanguages.contains(base) ? base : 'en';
}

final RegExp _dayPattern = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// True for a real calendar day written `YYYY-MM-DD` (web `isChallengeDay`).
bool isChallengeDay(String? value) {
  if (value == null || !_dayPattern.hasMatch(value)) return false;
  final y = int.parse(value.substring(0, 4));
  final m = int.parse(value.substring(5, 7));
  final d = int.parse(value.substring(8, 10));
  final date = DateTime.utc(y, m, d);
  return date.year == y && date.month == m && date.day == d;
}

/// A challenge content handed to a game screen, with the day it belongs to.
/// Records compare by value, so this can be part of a provider key.
typedef GivenChallenge<C extends ChallengeContent> = ({String day, C content});

// ---------------------------------------------------------------------------
// Parsing helpers: each throws [FormatException] on a wrong shape.

Map<String, dynamic> _map(Object? v) {
  if (v is Map<String, dynamic>) return v;
  if (v is Map) return v.map((k, val) => MapEntry('$k', val));
  throw const FormatException('object expected');
}

List<Object?> _list(Object? v, {int? length}) {
  if (v is! List) throw const FormatException('array expected');
  if (length != null && v.length != length) throw const FormatException('wrong length');
  return v;
}

String _str(Object? v) {
  if (v is String) return v;
  throw const FormatException('string expected');
}

int _int(Object? v) {
  if (v is int) return v;
  if (v is double && v == v.roundToDouble()) return v.toInt();
  throw const FormatException('integer expected');
}

int _digit(Object? v) {
  final n = _int(v);
  if (n < 1 || n > 9) throw const FormatException('digit expected');
  return n;
}

/// A {row, col} inside a rows x cols grid.
ChallengePos _pos(Object? v, int rows, int cols) {
  final m = _map(v);
  final p = ChallengePos(_int(m['row']), _int(m['col']));
  if (p.row < 0 || p.row >= rows || p.col < 0 || p.col >= cols) {
    throw const FormatException('position out of range');
  }
  return p;
}

const Set<String> _mathOperations = {'addition', 'subtraction', 'multiplication', 'division'};

String _operation(Object? v) {
  final s = _str(v);
  if (!_mathOperations.contains(s)) throw const FormatException('unknown operation');
  return s;
}

// ---------------------------------------------------------------------------
// Content

/// One game's challenge content. [kind] equals the rotation `gameId`.
/// Two contents are equal when their JSON is equal.
sealed class ChallengeContent {
  ChallengeContent(this._source);

  final String _source;

  String get kind;

  /// Parses one content object; null when it is not a known, well-formed kind.
  static ChallengeContent? fromJson(Object? json) {
    try {
      final m = _map(json);
      final source = jsonEncode(m);
      return switch (m['kind']) {
        'code-a-bot' => CodeABotContent._parse(m, source),
        'sudoku' => SudokuContent._parse(m, source),
        'math-challenge' => MathChallengeContent._parse(m, source),
        'math-maze' => MathMazeContent._parse(m, source),
        'word-puzzle' => WordPuzzleContent._parse(m, source),
        'hangman' => HangmanContent._parse(m, source),
        _ => null,
      };
    } on FormatException {
      return null;
    } on TypeError {
      return null;
    }
  }

  @override
  bool operator ==(Object other) =>
      other is ChallengeContent && other.kind == kind && other._source == _source;

  @override
  int get hashCode => Object.hash(kind, _source);
}

/// Code-a-Bot: the levels of [difficulty] to play, in order.
class CodeABotContent extends ChallengeContent {
  CodeABotContent._(super.source, this.difficulty, this.levelNumbers);

  final String difficulty;
  final List<int> levelNumbers;

  @override
  String get kind => 'code-a-bot';

  static CodeABotContent _parse(Map<String, dynamic> m, String source) {
    final difficulty = _str(m['difficulty']);
    if (!const {'easy', 'medium', 'hard'}.contains(difficulty)) {
      throw const FormatException('difficulty');
    }
    final levels = _list(m['levelNumbers']).map(_int).toList();
    if (levels.isEmpty || levels.any((n) => n < 1)) throw const FormatException('levels');
    return CodeABotContent._(source, difficulty, List.unmodifiable(levels));
  }
}

/// Sudoku: a 9x9 puzzle (`null` = blank) and its solution.
class SudokuContent extends ChallengeContent {
  SudokuContent._(super.source, this.puzzle, this.solution);

  final List<List<int?>> puzzle;
  final List<List<int>> solution;

  @override
  String get kind => 'sudoku';

  static SudokuContent _parse(Map<String, dynamic> m, String source) {
    final puzzle = [
      for (final row in _list(m['puzzle'], length: 9))
        [for (final v in _list(row, length: 9)) v == null ? null : _digit(v)],
    ];
    final solution = [
      for (final row in _list(m['solution'], length: 9))
        [for (final v in _list(row, length: 9)) _digit(v)],
    ];
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        final given = puzzle[r][c];
        if (given != null && given != solution[r][c]) {
          throw const FormatException('puzzle and solution differ');
        }
      }
    }
    return SudokuContent._(source, puzzle, solution);
  }
}

class ChallengeMathQuestion {
  const ChallengeMathQuestion(this.question, this.answer, this.operation);

  /// Display text, e.g. `12 × 4 = ?`.
  final String question;
  final int answer;

  /// `addition`, `subtraction`, `multiplication` or `division`.
  final String operation;
}

/// Math Challenge: the question list, played in order.
class MathChallengeContent extends ChallengeContent {
  MathChallengeContent._(super.source, this.questions);

  final List<ChallengeMathQuestion> questions;

  @override
  String get kind => 'math-challenge';

  static MathChallengeContent _parse(Map<String, dynamic> m, String source) {
    final questions = [
      for (final q in _list(m['questions']))
        ChallengeMathQuestion(
          _str(_map(q)['question']),
          _int(_map(q)['answer']),
          _operation(_map(q)['operation']),
        ),
    ];
    if (questions.isEmpty) throw const FormatException('no questions');
    return MathChallengeContent._(source, questions);
  }
}

class ChallengePos {
  const ChallengePos(this.row, this.col);

  final int row;
  final int col;
}

class ChallengeMazeGate {
  const ChallengeMazeGate(this.position, this.display, this.answer, this.operation);

  final ChallengePos position;
  final String display;
  final int answer;
  final String operation;
}

const Set<String> _mazeCells = {'wall', 'path', 'gate', 'collectible', 'start', 'exit'};

/// Math Maze: one maze (web `MazeData` shape) with its gate equations.
class MathMazeContent extends ChallengeContent {
  MathMazeContent._(
    super.source, {
    required this.grid,
    required this.start,
    required this.exit,
    required this.gates,
    required this.collectibles,
    required this.rows,
    required this.cols,
  });

  /// Cell names: wall, path, gate, collectible, start, exit.
  final List<List<String>> grid;
  final ChallengePos start;
  final ChallengePos exit;
  final List<ChallengeMazeGate> gates;
  final List<ChallengePos> collectibles;
  final int rows;
  final int cols;

  @override
  String get kind => 'math-maze';

  static MathMazeContent _parse(Map<String, dynamic> m, String source) {
    final maze = _map(m['maze']);
    final rows = _int(maze['rows']);
    final cols = _int(maze['cols']);
    if (rows < 2 || cols < 2 || rows > 30 || cols > 30) throw const FormatException('size');
    final grid = [
      for (final row in _list(maze['grid'], length: rows))
        [
          for (final cell in _list(row, length: cols))
            _mazeCells.contains(cell) ? cell as String : throw const FormatException('cell'),
        ],
    ];
    final gates = [
      for (final g in _list(maze['gates']))
        () {
          final gm = _map(g);
          final eq = _map(gm['equation']);
          final pos = _pos(gm['position'], rows, cols);
          if (grid[pos.row][pos.col] != 'gate') throw const FormatException('gate cell');
          return ChallengeMazeGate(pos, _str(eq['display']), _int(eq['answer']), _operation(eq['operation']));
        }(),
    ];
    return MathMazeContent._(
      source,
      grid: grid,
      start: _pos(maze['start'], rows, cols),
      exit: _pos(maze['exit'], rows, cols),
      gates: gates,
      collectibles: [for (final p in _list(maze['collectibles'])) _pos(p, rows, cols)],
      rows: rows,
      cols: cols,
    );
  }
}

class ChallengeWordGrid {
  const ChallengeWordGrid(this.grid, this.words, this.gridSize);

  /// gridSize x gridSize single upper-case letters.
  final List<List<String>> grid;

  /// Every word is placed in the grid.
  final List<String> words;
  final int gridSize;
}

final RegExp _letter = RegExp(r'^[A-Z]$');
final RegExp _word = RegExp(r'^[A-Z]{2,20}$');

/// Word Puzzle: one grid and word list per language.
class WordPuzzleContent extends ChallengeContent {
  WordPuzzleContent._(super.source, this.byLanguage);

  /// Keyed by language code; always has `en`.
  final Map<String, ChallengeWordGrid> byLanguage;

  @override
  String get kind => 'word-puzzle';

  /// The variant for [language] (a base code), falling back to `en`.
  ChallengeWordGrid variantFor(String language) => byLanguage[language] ?? byLanguage['en']!;

  static WordPuzzleContent _parse(Map<String, dynamic> m, String source) {
    final raw = _map(m['byLanguage']);
    final out = <String, ChallengeWordGrid>{};
    for (final lang in kChallengeLanguages) {
      if (!raw.containsKey(lang)) continue;
      final v = _map(raw[lang]);
      final size = _int(v['gridSize']);
      if (size < 4 || size > 30) throw const FormatException('grid size');
      final grid = [
        for (final row in _list(v['grid'], length: size))
          [
            for (final cell in _list(row, length: size))
              _letter.hasMatch(_str(cell)) ? cell as String : throw const FormatException('letter'),
          ],
      ];
      final words = [
        for (final w in _list(v['words']))
          _word.hasMatch(_str(w)) ? w as String : throw const FormatException('word'),
      ];
      if (words.isEmpty) throw const FormatException('no words');
      out[lang] = ChallengeWordGrid(grid, words, size);
    }
    if (!out.containsKey('en')) throw const FormatException('en variant');
    return WordPuzzleContent._(source, Map.unmodifiable(out));
  }
}

class ChallengeHangmanWord {
  const ChallengeHangmanWord(this.word, this.hint, this.category);

  final String word;
  final String hint;
  final String category;
}

/// Hangman: the rounds' words per language.
class HangmanContent extends ChallengeContent {
  HangmanContent._(super.source, this.byLanguage);

  /// Keyed by language code; always has `en`.
  final Map<String, List<ChallengeHangmanWord>> byLanguage;

  @override
  String get kind => 'hangman';

  /// The words for [language] (a base code), falling back to `en`.
  List<ChallengeHangmanWord> wordsFor(String language) => byLanguage[language] ?? byLanguage['en']!;

  static HangmanContent _parse(Map<String, dynamic> m, String source) {
    final raw = _map(m['byLanguage']);
    final out = <String, List<ChallengeHangmanWord>>{};
    for (final lang in kChallengeLanguages) {
      if (!raw.containsKey(lang)) continue;
      final words = [
        for (final w in _list(raw[lang]))
          () {
            final wm = _map(w);
            final word = _str(wm['word']);
            if (!_word.hasMatch(word)) throw const FormatException('word');
            return ChallengeHangmanWord(word, _str(wm['hint']), _str(wm['category']));
          }(),
      ];
      if (words.isEmpty) throw const FormatException('no words');
      out[lang] = words;
    }
    if (!out.containsKey('en')) throw const FormatException('en variant');
    return HangmanContent._(source, Map.unmodifiable(out));
  }
}

// ---------------------------------------------------------------------------
// Views

/// The player's best entry on a challenge day.
class ChallengeMyEntry {
  const ChallengeMyEntry({required this.bestScore, required this.rank, required this.achievedAt});

  final int bestScore;
  final int rank;
  final String achievedAt;

  static ChallengeMyEntry? fromJson(Object? json) {
    if (json is! Map) return null;
    return ChallengeMyEntry(
      bestScore: (json['bestScore'] as num?)?.toInt() ?? 0,
      rank: (json['rank'] as num?)?.toInt() ?? 0,
      achievedAt: json['achievedAt'] as String? ?? '',
    );
  }
}

/// Response of `getDailyChallenge`.
class DailyChallengeView {
  const DailyChallengeView({
    required this.day,
    required this.gameId,
    required this.themeId,
    required this.difficulty,
    required this.settings,
    required this.content,
    required this.endsAt,
    this.me,
  });

  final String day;
  final String gameId;
  final String themeId;

  /// 2 (medium) for every challenge.
  final int difficulty;
  final Map<String, dynamic> settings;
  final ChallengeContent content;

  /// ISO time of the next Eastern midnight.
  final String endsAt;
  final ChallengeMyEntry? me;

  /// Parses the response, JSON-decoding `settings` and `content`. Null when a
  /// field is missing or malformed, or the content is not for [gameId]
  /// (web `parseDailyChallenge`).
  static DailyChallengeView? fromJson(Object? json) {
    if (json is! Map) return null;
    final day = json['day'];
    final gameId = json['gameId'];
    final themeId = json['themeId'];
    final settingsText = json['settings'];
    final contentText = json['content'];
    if (day is! String || !isChallengeDay(day) || gameId is! String || themeId is! String) {
      return null;
    }
    if (settingsText is! String || contentText is! String) return null;
    Object? settings;
    Object? rawContent;
    try {
      settings = jsonDecode(settingsText);
      rawContent = jsonDecode(contentText);
    } on FormatException {
      return null;
    }
    if (settings is! Map<String, dynamic>) return null;
    final content = ChallengeContent.fromJson(rawContent);
    if (content == null || content.kind != gameId) return null;
    return DailyChallengeView(
      day: day,
      gameId: gameId,
      themeId: themeId,
      difficulty: (json['difficulty'] as num?)?.toInt() ?? 2,
      settings: settings,
      content: content,
      endsAt: json['endsAt'] as String? ?? '',
      me: ChallengeMyEntry.fromJson(json['me']),
    );
  }
}

class ChallengeEntry {
  const ChallengeEntry({
    required this.rank,
    required this.username,
    required this.score,
    required this.achievedAt,
    required this.isMe,
  });

  final int rank;
  final String username;
  final int score;
  final String achievedAt;
  final bool isMe;

  factory ChallengeEntry.fromJson(Map<String, dynamic> json) => ChallengeEntry(
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        username: json['username'] as String? ?? '',
        score: (json['score'] as num?)?.toInt() ?? 0,
        achievedAt: json['achievedAt'] as String? ?? '',
        isMe: json['isMe'] as bool? ?? false,
      );
}

/// Response of `getChallengeLeaderboard`.
class ChallengeLeaderboardView {
  const ChallengeLeaderboardView({
    required this.day,
    required this.gameId,
    required this.themeId,
    required this.isFinal,
    required this.entries,
    this.me,
  });

  final String day;
  final String gameId;
  final String themeId;

  /// True once the day is over (`final` on the wire).
  final bool isFinal;
  final List<ChallengeEntry> entries;
  final ChallengeMyEntry? me;

  factory ChallengeLeaderboardView.fromJson(Map<String, dynamic> json) => ChallengeLeaderboardView(
        day: json['day'] as String? ?? '',
        gameId: json['gameId'] as String? ?? '',
        themeId: json['themeId'] as String? ?? '',
        isFinal: json['final'] as bool? ?? false,
        entries: ((json['entries'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(ChallengeEntry.fromJson)
            .toList(),
        me: ChallengeMyEntry.fromJson(json['me']),
      );
}

/// `completeGame.challenge`: null for games that were not challenge plays.
class ChallengeCompletionResult {
  const ChallengeCompletionResult({
    required this.day,
    required this.recorded,
    this.bestScore,
    this.rank,
    this.isNewBest = false,
  });

  final String day;
  final bool recorded;
  final int? bestScore;
  final int? rank;
  final bool isNewBest;

  factory ChallengeCompletionResult.fromJson(Map<String, dynamic> json) => ChallengeCompletionResult(
        day: json['day'] as String? ?? '',
        recorded: json['recorded'] as bool? ?? false,
        bestScore: (json['bestScore'] as num?)?.toInt(),
        rank: (json['rank'] as num?)?.toInt(),
        isNewBest: json['isNewBest'] as bool? ?? false,
      );
}
