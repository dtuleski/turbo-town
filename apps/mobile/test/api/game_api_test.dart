import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/quest_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

/// Records each request and answers with the next scripted `data` map.
class _ScriptedLink extends Link {
  _ScriptedLink(this.responses);

  final List<Map<String, dynamic>> responses;
  final List<Request> requests = [];

  @override
  Stream<Response> request(Request request, [NextLink? forward]) {
    requests.add(request);
    final data = _withTypenames(responses.removeAt(0)) as Map<String, dynamic>;
    return Stream.value(Response(data: data, response: const {}));
  }
}

/// graphql_flutter adds `__typename` to every selection set and its cache
/// needs it back, as a real server sends it.
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

GameApi _api(_ScriptedLink link) => GameApi(GraphQLClient(
      link: link,
      cache: GraphQLCache(),
      defaultPolicies: DefaultPolicies(
        query: Policies(fetch: FetchPolicy.networkOnly),
        mutate: Policies(fetch: FetchPolicy.noCache),
      ),
    ));

Map<String, dynamic> _input(Request r) =>
    r.variables['input'] as Map<String, dynamic>;

void main() {
  test('startGame sends questContext only when given', () async {
    final link = _ScriptedLink([
      {'startGame': {'id': 'g1', 'themeId': 'ANIMALS', 'difficulty': 1}},
      {'startGame': {'id': 'g2', 'themeId': 'ANIMALS', 'difficulty': 1}},
    ]);
    final api = _api(link);

    await api.startGame(themeId: 'ANIMALS', difficulty: 1);
    await api.startGame(
      themeId: 'ANIMALS',
      difficulty: 1,
      questContext: const QuestContext(
        worldId: 'brain-peaks',
        nodeId: 'bp-01-memory',
        legIndex: 0,
      ),
    );

    expect(_input(link.requests[0]).containsKey('questContext'), isFalse);
    expect(_input(link.requests[1])['questContext'], {
      'worldId': 'brain-peaks',
      'nodeId': 'bp-01-memory',
      'legIndex': 0,
    });
  });

  test('completeGame forwards only the keys the server accepts', () async {
    final link = _ScriptedLink([
      {
        'completeGame': {
          'id': 'g1',
          'status': 'COMPLETED',
          'score': 4321,
          'achievements': [
            {'type': 'FIRST_WIN', 'unlocked': true, 'progress': 1},
          ],
          'quest': {
            'worldId': 'brain-peaks',
            'nodeId': 'bp-01-memory',
            'kind': 'GAME',
            'score': 4321,
            'thresholds': [1450, 2750, 3000],
            'stars': 3,
            'bestStars': 3,
            'newlyUnlocked': ['bp-02-math'],
            'worldCleared': false,
            'badgesAwarded': [],
            'gauntlet': null,
          },
        },
      },
    ]);
    final api = _api(link);

    final result = await api.completeGame(
      gameId: 'g1',
      completionTime: 30,
      attempts: 8,
      extra: {
        'correctAnswers': 7,
        'totalQuestions': 10,
        'hintsUsed': null,
        'score': 999999, // a client score must never be sent
        'circuitSubmission': {'levelId': 'l1'},
      },
    );

    final input = _input(link.requests.single);
    expect(input['gameId'], 'g1');
    expect(input['completionTime'], 30);
    expect(input['attempts'], 8);
    expect(input['correctAnswers'], 7);
    expect(input['totalQuestions'], 10);
    expect(input['circuitSubmission'], {'levelId': 'l1'});
    expect(input.containsKey('hintsUsed'), isFalse);
    expect(input.containsKey('score'), isFalse);

    expect(result.score, 4321);
    expect(result.achievements.single.type, 'FIRST_WIN');
    expect(result.quest?.stars, 3);
    expect(result.quest?.newlyUnlocked, ['bp-02-math']);
  });

  test('catalog, quest progress and review queries parse', () async {
    final link = _ScriptedLink([
      {
        'listAvailableGames': [
          {
            'gameId': 'memory-match',
            'title': 'Memory Match',
            'description': 'd',
            'icon': '🃏',
            'route': '/game/setup',
            'status': 'ACTIVE',
            'displayOrder': 1,
            'ageRange': '4+',
            'category': 'Puzzles',
          },
        ],
      },
      {
        'getQuestProgress': {
          'tier': 'FREE',
          'rateLimit': {'limit': 10, 'used': 3, 'remaining': 7, 'resetAt': null},
          'worlds': [
            {
              'id': 'brain-peaks',
              'order': 1,
              'accessible': true,
              'totalStars': 2,
              'maxStars': 30,
              'badges': ['WORLD_CLEARED'],
              'activeGauntlet': null,
              'nodes': [
                {
                  'id': 'bp-01-memory',
                  'kind': 'GAME',
                  'status': 'AVAILABLE',
                  'stars': 2,
                  'bestScore': 2800,
                  'thresholds': [1450, 2750, 3000],
                  'map': {'x': 20, 'y': 92},
                  'legs': [
                    {'themeId': 'ANIMALS', 'difficulty': 1, 'params': null},
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        'getReviewStats': {
          'perGame': [
            {'gameType': 'MEMORY_MATCH', 'averageRating': 4.5, 'totalReviews': 12},
          ],
          'overall': {'gameType': 'ALL', 'averageRating': 4.0, 'totalReviews': 40},
        },
      },
      {
        'submitGameReview': {'success': true},
      },
    ]);
    final api = _api(link);

    final games = await api.listAvailableGames();
    expect(games.single.gameId, 'memory-match');
    expect(games.single.isActive, isTrue);

    final quest = await api.getQuestProgress();
    expect(quest.rateLimit.remaining, 7);
    expect(quest.worlds.single.nodes.single.mapX, 20);
    expect(quest.worlds.single.nodes.single.legs.single.themeId, 'ANIMALS');

    final stats = await api.getReviewStats();
    expect(stats.perGame.single.averageRating, 4.5);

    expect(await api.submitGameReview('MEMORY_MATCH', 5), isTrue);
    expect(_input(link.requests.last), {'gameType': 'MEMORY_MATCH', 'rating': 5});
  });

  test('QuestContext.parse accepts only world:node:leg', () {
    final ok = QuestContext.parse('brain-peaks:bp-01-memory:2');
    expect(ok?.worldId, 'brain-peaks');
    expect(ok?.legIndex, 2);
    for (final bad in [
      null,
      '',
      'a:b',
      'a:b:3',
      'a:b:c',
      'A:b:0',
      'a:b:0:1',
      '${'x' * 41}:b:0',
    ]) {
      expect(QuestContext.parse(bad), isNull, reason: '$bad');
    }
  });
}
