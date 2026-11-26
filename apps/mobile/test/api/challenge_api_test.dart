import 'dart:convert';

import 'package:dashden_mobile/api/challenge_api.dart';
import 'package:dashden_mobile/api/challenge_models.dart';
import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/quest_models.dart';
import 'package:dashden_mobile/challenge/challenge_content.dart';
import 'package:dashden_mobile/challenge/challenge_launch.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../helpers/challenge_fixtures.dart';

/// Records each request and answers with the next scripted response: a `data`
/// map, or a [GraphQLError] list.
class _ScriptedLink extends Link {
  _ScriptedLink(this.responses);

  final List<Object> responses;
  final List<Request> requests = [];

  @override
  Stream<Response> request(Request request, [NextLink? forward]) {
    requests.add(request);
    final next = responses.removeAt(0);
    if (next is List<GraphQLError>) {
      return Stream.value(Response(errors: next, response: const {}));
    }
    return Stream.value(Response(data: _withTypenames(next) as Map<String, dynamic>, response: const {}));
  }
}

Object? _withTypenames(Object? value) {
  if (value is Map) {
    return {
      '__typename': 'T',
      for (final e in value.entries) e.key as String: _withTypenames(e.value),
    };
  }
  if (value is List) return value.map(_withTypenames).toList();
  return value;
}

GraphQLClient _client(_ScriptedLink link) => GraphQLClient(
      link: link,
      cache: GraphQLCache(),
      defaultPolicies: DefaultPolicies(
        query: Policies(fetch: FetchPolicy.noCache),
        mutate: Policies(fetch: FetchPolicy.noCache),
      ),
    );

Map<String, dynamic> _input(Request r) => r.variables['input'] as Map<String, dynamic>;

Future<DailyChallengeView?> _served(Map<String, dynamic> payload) =>
    ChallengeApi(_client(_ScriptedLink([
      {'getDailyChallenge': payload},
    ]))).getDailyChallenge();

void main() {
  group('getDailyChallenge', () {
    test('parses the JSON text fields of every first-batch game', () async {
      final contents = [
        codeABotContentJson(),
        sudokuContentJson(),
        mathContentJson(),
        mazeContentJson(),
        wordPuzzleContentJson(),
        hangmanContentJson(),
      ];
      for (final content in contents) {
        final view = await _served(dailyChallengeJson(content));
        expect(view, isNotNull, reason: content['kind'] as String);
        expect(view!.day, kTestDay);
        expect(view.gameId, content['kind']);
        expect(view.content.kind, content['kind']);
        expect(view.difficulty, 2);
        expect(view.settings, {'size': 1});
      }
    });

    test('typed content matches the served JSON', () async {
      final sudoku = sudokuContentJson();
      final view = await _served(dailyChallengeJson(sudoku));
      final content = view!.content as SudokuContent;
      expect(content.puzzle, sudoku['puzzle']);
      expect(content.solution, sudoku['solution']);

      final bot = (await _served(dailyChallengeJson(codeABotContentJson())))!.content as CodeABotContent;
      expect(bot.difficulty, 'medium');
      expect(bot.levelNumbers, [1, 2, 3, 4, 5]);

      final words = (await _served(dailyChallengeJson(wordPuzzleContentJson())))!.content as WordPuzzleContent;
      expect(words.byLanguage.keys, ['en', 'es', 'pt']);
      expect(words.variantFor('fr'), same(words.byLanguage['en']));
    });

    test('returns null when the feature is off, the call fails or the content is unusable', () async {
      final api = ChallengeApi(_client(_ScriptedLink([
        {'getDailyChallenge': null},
        [const GraphQLError(message: 'Daily challenge is not available')],
      ])));
      expect(await api.getDailyChallenge(), isNull);
      expect(await api.getDailyChallenge(), isNull);

      final ok = dailyChallengeJson(sudokuContentJson());
      expect(await _served({...ok, 'content': '{not json'}), isNull);
      expect(await _served({...ok, 'settings': '[1]'}), isNull);
      expect(await _served({...ok, 'gameId': 'hangman'}), isNull, reason: 'kind must equal gameId');
      expect(await _served({...ok, 'day': '2026-02-30'}), isNull);

      final badSudoku = sudokuContentJson()..['puzzle'] = (sudokuContentJson()['puzzle'] as List).sublist(1);
      expect(await _served(dailyChallengeJson(badSudoku)), isNull);
      final solution = (sudokuContentJson()['solution'] as List).map((r) => List<int>.of(r as List<int>)).toList();
      final puzzle = (sudokuContentJson()['puzzle'] as List).map((r) => List<int?>.of(r as List<int?>)).toList();
      final r = puzzle.indexWhere((row) => row.any((v) => v != null));
      final c = puzzle[r].indexWhere((v) => v != null);
      solution[r][c] = solution[r][c] == 9 ? 1 : solution[r][c] + 1;
      expect(await _served(dailyChallengeJson({'kind': 'sudoku', 'puzzle': puzzle, 'solution': solution})), isNull,
          reason: 'a given cell must match the solution');

      final words = wordPuzzleContentJson();
      (words['byLanguage'] as Map).remove('en');
      expect(await _served(dailyChallengeJson(words)), isNull, reason: 'en is the fallback');
      final maze = mazeContentJson();
      ((maze['maze'] as Map)['grid'] as List)[0] = ['lava'];
      expect(await _served(dailyChallengeJson(maze)), isNull);
      expect(await _served(dailyChallengeJson({'kind': 'scratch-coding'})), isNull);
    });

    test('content equality follows the JSON, so it can key a provider', () {
      final a = ChallengeContent.fromJson(sudokuContentJson(1));
      final b = ChallengeContent.fromJson(jsonDecode(jsonEncode(sudokuContentJson(1))));
      final c = ChallengeContent.fromJson(sudokuContentJson(2));
      expect(a, b);
      expect(a.hashCode, b.hashCode);
      expect(a, isNot(c));
      expect((day: kTestDay, content: a), (day: kTestDay, content: b));
    });
  });

  test('getChallengeLeaderboard sends the day and parses entries', () async {
    final link = _ScriptedLink([
      {
        'getChallengeLeaderboard': {
          'day': '2026-11-25',
          'gameId': 'sudoku',
          'themeId': 'SUDOKU',
          'final': true,
          'entries': [
            {'rank': 1, 'username': 'ana', 'score': 900, 'achievedAt': '2026-11-25T15:00:00Z', 'isMe': false},
            {'rank': 2, 'username': 'me', 'score': 800, 'achievedAt': '2026-11-25T16:00:00Z', 'isMe': true},
          ],
          'me': {'bestScore': 800, 'rank': 2, 'achievedAt': '2026-11-25T16:00:00Z'},
        },
      },
      [const GraphQLError(message: 'nope')],
    ]);
    final api = ChallengeApi(_client(link));
    final board = await api.getChallengeLeaderboard(day: '2026-11-25', limit: 10);
    expect(link.requests.first.variables, {'day': '2026-11-25', 'limit': 10});
    expect(board!.isFinal, isTrue);
    expect(board.entries.map((e) => e.username), ['ana', 'me']);
    expect(board.entries.last.isMe, isTrue);
    expect(board.me?.rank, 2);
    expect(await api.getChallengeLeaderboard(), isNull);
  });

  group('game API', () {
    test('startGame sends challengeContext only for a challenge launch; the quest context wins', () async {
      final link = _ScriptedLink([
        for (var i = 0; i < 3; i++)
          {'startGame': {'id': 'g$i', 'themeId': 'SUDOKU', 'difficulty': 2}},
      ]);
      final api = GameApi(_client(link));
      await api.startGame(themeId: 'SUDOKU', difficulty: 2);
      await api.startGame(themeId: 'SUDOKU', difficulty: 2, challengeDay: kTestDay);
      await api.startGame(
        themeId: 'SUDOKU',
        difficulty: 2,
        challengeDay: kTestDay,
        questContext: const QuestContext(worldId: 'brain-peaks', nodeId: 'bp-01', legIndex: 0),
      );
      expect(_input(link.requests[0]).containsKey('challengeContext'), isFalse);
      expect(_input(link.requests[1])['challengeContext'], {'day': kTestDay});
      expect(_input(link.requests[1]).containsKey('questContext'), isFalse);
      expect(_input(link.requests[2]).containsKey('challengeContext'), isFalse);
      expect(_input(link.requests[2])['questContext'], isNotNull);
    });

    test('completeGame selects and parses the challenge result', () async {
      final link = _ScriptedLink([
        {
          'completeGame': {
            'id': 'g1',
            'status': 'COMPLETED',
            'score': 900,
            'challenge': {'day': kTestDay, 'recorded': true, 'bestScore': 900, 'rank': 3, 'isNewBest': true},
          },
        },
        {
          'completeGame': {'id': 'g2', 'status': 'COMPLETED', 'score': 10, 'challenge': null},
        },
      ]);
      final api = GameApi(_client(link));
      final first = await api.completeGame(gameId: 'g1', completionTime: 5, attempts: 1);
      expect(first.challenge?.day, kTestDay);
      expect(first.challenge?.recorded, isTrue);
      expect(first.challenge?.bestScore, 900);
      expect(first.challenge?.rank, 3);
      expect(first.challenge?.isNewBest, isTrue);
      final second = await api.completeGame(gameId: 'g2', completionTime: 5, attempts: 1);
      expect(second.challenge, isNull);
    });
  });

  group('launch helpers', () {
    test('isChallengeDay accepts real calendar days only', () {
      expect(isChallengeDay('2026-11-26'), isTrue);
      expect(isChallengeDay('2028-02-29'), isTrue);
      for (final bad in [null, '', '2026-02-30', '2026-13-01', '26-11-26', '2026-11-26x', '2026/11/26']) {
        expect(isChallengeDay(bad), isFalse, reason: '$bad');
      }
    });

    test('parseChallengeParam reads challenge=<day> unless a valid quest param is present', () {
      expect(parseChallengeParam({'difficulty': 'medium', 'challenge': kTestDay}), kTestDay);
      expect(parseChallengeParam({'difficulty': 'medium'}), isNull);
      expect(parseChallengeParam({'challenge': 'today'}), isNull);
      expect(parseChallengeParam({'challenge': kTestDay, 'quest': 'brain-peaks:bp-01:0'}), isNull);
      expect(parseChallengeParam({'challenge': kTestDay, 'quest': 'bad'}), kTestDay);
    });

    test('selectChallengeContent checks the game and the day', () {
      final view = dailyChallengeView(sudokuContentJson());
      expect(selectChallengeContent<SudokuContent>(view, kTestDay), isNotNull);
      expect(selectChallengeContent<SudokuContent>(view, '2026-11-25'), isNull);
      expect(selectChallengeContent<HangmanContent>(view, kTestDay), isNull);
      expect(selectChallengeContent<SudokuContent>(null, kTestDay), isNull);
    });

    test('challengeLanguage uses the base code and falls back to en', () {
      expect(challengeLanguage('pt'), 'pt');
      expect(challengeLanguage('es-AR'), 'es');
      expect(challengeLanguage('fr'), 'en');
      expect(challengeLanguage(null), 'en');
      expect(challengeDifficultyName(2), 'medium');
      expect(challengeDifficultyName(9), 'medium');
    });
  });

  group('converters report the shared expectedTotals', () {
    test('sudoku: blanks are the null cells', () {
      final json = sudokuContentJson();
      final blanks = (json['puzzle'] as List).expand((r) => r as List).where((v) => v == null).length;
      final p = sudokuFromChallenge(ChallengeContent.fromJson(json) as SudokuContent);
      expect(p.puzzle.expand((r) => r).where((v) => v == 0).length, blanks);
      expect(p.solution, json['solution']);
    });

    test('math: the questions in order', () {
      final qs = mathQuestionsFromChallenge(ChallengeContent.fromJson(mathContentJson()) as MathChallengeContent);
      expect(qs, hasLength(15));
      expect(qs.first.question, '1 + 2 = ?');
      expect(qs.first.answer, 3);
    });

    test('math maze: the same grid and one question per gate', () {
      final json = mazeContentJson();
      final maze = mazeFromChallenge(ChallengeContent.fromJson(json) as MathMazeContent);
      final raw = json['maze'] as Map<String, dynamic>;
      expect(maze.gates, hasLength((raw['gates'] as List).length));
      expect([for (final row in maze.grid) [for (final c in row) c.name]], raw['grid']);
      expect(maze.start.row, (raw['start'] as Map)['row']);
      expect(maze.collectibles, hasLength((raw['collectibles'] as List).length));
    });

    test('word puzzle: the language variant with every word located in its grid', () {
      final json = wordPuzzleContentJson();
      final content = ChallengeContent.fromJson(json) as WordPuzzleContent;
      for (final lang in ['en', 'es', 'pt']) {
        final p = wordPuzzleFromChallenge(content, lang);
        final variant = (json['byLanguage'] as Map)[lang] as Map;
        expect(p.words, variant['words']);
        expect(p.positions.map((x) => x.word), p.words, reason: lang);
      }
      expect(wordPuzzleFromChallenge(content, 'fr').words, ((json['byLanguage'] as Map)['en'] as Map)['words']);
    });

    test('hangman: the words for the language, fallback en', () {
      final content = ChallengeContent.fromJson(hangmanContentJson()) as HangmanContent;
      expect(hangmanWordsFromChallenge(content, 'es').map((w) => w.word), ['GATO', 'PERRO', 'CASA', 'LUNA', 'MESA']);
      expect(hangmanWordsFromChallenge(content, 'de').first.word, 'APPLE');
      expect(hangmanWordsFromChallenge(content, 'en'), hasLength(5));
    });
  });
}
