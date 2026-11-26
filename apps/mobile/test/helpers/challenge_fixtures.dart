import 'dart:convert';
import 'dart:math';

import 'package:dashden_mobile/api/challenge_api.dart';
import 'package:dashden_mobile/api/challenge_models.dart';
import 'package:dashden_mobile/game/math_maze/logic.dart';
import 'package:dashden_mobile/game/sudoku/logic.dart';
import 'package:dashden_mobile/game/word_puzzle/word_puzzle_logic.dart';

/// The challenge day used by the tests.
const String kTestDay = '2026-11-26';

/// Content JSON in the shapes of packages/shared/src/challenge/types.ts, built
/// from the app's own generators so the sizes are realistic.
Map<String, dynamic> codeABotContentJson() =>
    {'kind': 'code-a-bot', 'difficulty': 'medium', 'levelNumbers': [1, 2, 3, 4, 5]};

Map<String, dynamic> sudokuContentJson([int seed = 7]) {
  final p = generateSudoku('medium', Random(seed));
  return {
    'kind': 'sudoku',
    'puzzle': [
      for (final row in p.puzzle) [for (final v in row) v == 0 ? null : v],
    ],
    'solution': p.solution,
  };
}

Map<String, dynamic> mathContentJson() => {
      'kind': 'math-challenge',
      'questions': [
        for (var i = 1; i <= 15; i++)
          {'question': '$i + 2 = ?', 'answer': i + 2, 'operation': 'addition'},
      ],
    };

Map<String, dynamic> mazeContentJson([int seed = 3]) {
  final m = generateMaze('medium', Random(seed));
  Map<String, int> pos(MazePos p) => {'row': p.row, 'col': p.col};
  return {
    'kind': 'math-maze',
    'maze': {
      'grid': [
        for (final row in m.grid) [for (final c in row) c.name],
      ],
      'start': pos(m.start),
      'exit': pos(m.exit),
      'gates': [
        for (final g in m.gates)
          {
            'position': pos(g.position),
            // The challenge uses the four medium operations only.
            'equation': {'display': '${g.equation.answer} + 0 = ?', 'answer': g.equation.answer, 'operation': 'addition'},
          },
      ],
      'collectibles': [for (final c in m.collectibles) pos(c)],
      'rows': m.rows,
      'cols': m.cols,
    },
  };
}

Map<String, dynamic> wordPuzzleContentJson() {
  Map<String, dynamic> variant(String lang, int seed) {
    final p = generateWordPuzzle('medium', lang, Random(seed));
    return {'grid': p.grid, 'words': p.words, 'gridSize': p.gridSize};
  }

  return {
    'kind': 'word-puzzle',
    'byLanguage': {'en': variant('en', 1), 'es': variant('es', 2), 'pt': variant('pt', 3)},
  };
}

Map<String, dynamic> hangmanContentJson() {
  List<Map<String, String>> words(String prefix) => [
        for (final w in ['APPLE', 'BREAD', 'CHAIR', 'DREAM', 'EAGLE'])
          {'word': w, 'hint': '$prefix hint $w', 'category': '$prefix category'},
      ];
  return {
    'kind': 'hangman',
    'byLanguage': {
      'en': words('en'),
      'es': [
        for (final w in ['GATO', 'PERRO', 'CASA', 'LUNA', 'MESA'])
          {'word': w, 'hint': 'es $w', 'category': 'es'},
      ],
      'pt': words('pt'),
    },
  };
}

const Map<String, String> kChallengeThemes = {
  'code-a-bot': 'CODE_A_BOT',
  'sudoku': 'SUDOKU',
  'math-challenge': 'MATH_CHALLENGE',
  'math-maze': 'MATH_MAZE',
  'word-puzzle': 'WORD_PUZZLE',
  'hangman': 'HANGMAN',
};

/// A `getDailyChallenge` payload as the server sends it (JSON text fields).
Map<String, dynamic> dailyChallengeJson(Map<String, dynamic> content, {String day = kTestDay}) {
  final gameId = content['kind'] as String;
  return {
    'day': day,
    'gameId': gameId,
    'themeId': kChallengeThemes[gameId],
    'difficulty': 2,
    'settings': jsonEncode({'size': 1}),
    'content': jsonEncode(content),
    'endsAt': '2026-11-27T05:00:00.000Z',
    'me': null,
  };
}

DailyChallengeView dailyChallengeView(Map<String, dynamic> content, {String day = kTestDay}) =>
    DailyChallengeView.fromJson(dailyChallengeJson(content, day: day))!;

/// In-memory [ChallengeApi] answering with [challenge].
class FakeChallengeApi implements ChallengeApi {
  FakeChallengeApi([this.challenge]);

  DailyChallengeView? challenge;
  int dailyCalls = 0;

  @override
  Future<DailyChallengeView?> getDailyChallenge() async {
    dailyCalls++;
    return challenge;
  }

  @override
  Future<ChallengeLeaderboardView?> getChallengeLeaderboard({String? day, int? limit}) async => null;
}
