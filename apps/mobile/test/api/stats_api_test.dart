import 'dart:io';

import 'package:dashden_mobile/api/leaderboard_api.dart';
import 'package:dashden_mobile/api/profile_api.dart';
import 'package:dashden_mobile/api/stats_api.dart';
import 'package:dashden_mobile/api/stats_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

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

GraphQLClient _client(Link link) => GraphQLClient(
      link: link,
      cache: GraphQLCache(),
      defaultPolicies: DefaultPolicies(
        query: Policies(fetch: FetchPolicy.networkOnly),
        mutate: Policies(fetch: FetchPolicy.noCache),
      ),
    );

const _entry = {
  'rank': 2,
  'userId': 'u',
  'username': 'ana',
  'score': 800,
  'gameType': 'SUDOKU',
  'difficulty': 'easy',
  'completionTime': 61.5,
  'accuracy': 0.9,
  'timestamp': '2025-03-01T10:00:00.000Z',
  'isCurrentUser': true,
};

void main() {
  test('getUserStatistics parses totals and favorite theme', () async {
    final link = _ScriptedLink([
      {
        'getUserStatistics': {
          'totalGames': 5,
          'totalCompletedGames': 4,
          'averageScore': 700.5,
          'bestScore': 1200,
          'averageCompletionTime': 50,
          'fastestCompletionTime': 12,
          'totalAttempts': 40,
          'averageAttempts': 8,
          'favoriteTheme': {'id': 'ANIMALS', 'name': 'Animals'},
          'favoriteDifficulty': 2,
          'currentStreak': 2,
          'longestStreak': 3,
        },
      },
    ]);
    final s = await StatsApi(_client(link)).getUserStatistics();
    expect(s.totalGames, 5);
    expect(s.averageScore, 700.5);
    expect(s.favoriteThemeName, 'Animals');
    expect(s.fastestCompletionTime, 12);
  });

  test('getGameHistory sends paging and only the filters given', () async {
    final link = _ScriptedLink([
      {
        'getGameHistory': {
          'games': [
            {
              'id': 'g1',
              'themeId': 'ANIMALS',
              'themeName': 'Animals',
              'difficulty': 2,
              'completedAt': '2025-03-01T10:00:00.000Z',
              'completionTime': 30,
              'attempts': 9,
              'score': 500,
            },
          ],
          'pagination': {'total': 11, 'page': 2, 'pageSize': 10, 'hasMore': false},
        },
      },
    ]);
    final page = await StatsApi(_client(link)).getGameHistory(
      page: 2,
      sortBy: 'score',
      sortOrder: 'desc',
      difficulty: 2,
    );
    final input = link.requests.single.variables['input'] as Map<String, dynamic>;
    expect(input, {
      'page': 2,
      'pageSize': 10,
      'sortBy': 'score',
      'sortOrder': 'desc',
      'difficulty': 2,
    });
    expect(page.total, 11);
    expect(page.hasMore, isFalse);
    expect(page.games.single.score, 500);
  });

  test('leaderboard queries send wire enums and parse entries', () async {
    final link = _ScriptedLink([
      {
        'getLeaderboard': {
          'entries': [_entry],
          'currentUserEntry': _entry,
          'totalEntries': 1,
          'timeframe': 'WEEKLY',
        },
      },
      {
        'getUserRank': {
          'rank': 3,
          'score': 10,
          'gameType': 'OVERALL',
          'timeframe': 'ALL_TIME',
          'totalPlayers': 50,
          'percentile': 94.0,
        },
      },
      {
        'getUserScoreHistory': [_entry],
      },
      {'getUserRank': null},
    ]);
    final api = LeaderboardApi(_client(link));
    final board = await api.getLeaderboard(
      LeaderboardGameType.codeABot,
      LeaderboardTimeframe.weekly,
      limit: 25,
    );
    expect(link.requests[0].variables, {
      'gameType': 'CODE_A_BOT',
      'timeframe': 'WEEKLY',
      'limit': 25,
    });
    expect(board.entries.single.username, 'ana');
    expect(board.currentUserEntry?.isCurrentUser, isTrue);
    expect(board.entries.single.completionTime, 61.5);

    final rank = await api.getUserRank(
        LeaderboardGameType.overall, LeaderboardTimeframe.allTime);
    expect(link.requests[1].variables['timeframe'], 'ALL_TIME');
    expect(rank?.percentile, 94.0);

    final history = await api.getUserScoreHistory(limit: 100);
    expect(link.requests[2].variables, {'limit': 100});
    expect(history.single.gameType, 'SUDOKU');

    expect(
      await api.getUserRank(LeaderboardGameType.overall, LeaderboardTimeframe.daily),
      isNull,
    );
  });

  test('the new API files hold no admin operations', () {
    for (final f in ['stats_api', 'leaderboard_api', 'profile_api']) {
      final src = File('lib/api/$f.dart').readAsStringSync();
      expect(src, isNot(contains('mutation ClearAllRecords')), reason: f);
      expect(src, isNot(contains('adminSetEmailPrefs')), reason: f);
      expect(src, isNot(contains('adminGetAllEmailPrefs')), reason: f);
    }
  });

  test('profile api sends digest and contact payloads', () async {
    final link = _ScriptedLink([
      {'getEmailPrefs': {'userId': 'u', 'dailyDigest': true}},
      {'setEmailPrefs': {'userId': 'u', 'dailyDigest': false}},
      {'submitContactForm': {'success': true}},
      {'submitContactForm': {'success': false}},
    ]);
    final api = ProfileApi(_client(link));
    expect((await api.getEmailPrefs()).dailyDigest, isTrue);
    expect((await api.setEmailPrefs(false)).dailyDigest, isFalse);
    expect(link.requests[1].variables['input'], {'dailyDigest': false});
    await api.submitContactForm(
      type: ContactType.question,
      subject: 'S',
      message: 'M',
    );
    expect(link.requests[2].variables['input'], {
      'type': 'question',
      'subject': 'S',
      'message': 'M',
    });
    await expectLater(
      api.submitContactForm(type: ContactType.bug, subject: 'S', message: 'M'),
      throwsA(isA<StateError>()),
    );
  });

  test('profile api sends notification settings and push device payloads', () async {
    final link = _ScriptedLink([
      {'saveNotificationSettings': {'timeZone': 'America/Chicago', 'language': 'es'}},
      {'saveNotificationSettings': {'timeZone': null, 'language': 'pt'}},
      {'registerPushDevice': {'ok': true}},
      {'unregisterPushDevice': {'ok': false}},
    ]);
    final api = ProfileApi(_client(link));
    await api.saveNotificationSettings(timeZone: 'America/Chicago', language: 'es');
    await api.saveNotificationSettings(language: 'pt');
    expect(link.requests[0].variables['input'], {'timeZone': 'America/Chicago', 'language': 'es'});
    expect(link.requests[1].variables['input'], {'language': 'pt'});
    final token = 'ab' * 32;
    expect(
      await api.registerPushDevice(token: token, environment: 'sandbox', timeZone: 'America/Chicago', language: 'en'),
      isTrue,
    );
    expect(link.requests[2].variables['input'], {
      'token': token,
      'platform': 'IOS',
      'environment': 'sandbox',
      'timeZone': 'America/Chicago',
      'language': 'en',
    });
    expect(await api.unregisterPushDevice(token), isFalse);
    expect(link.requests[3].variables, {'token': token});
  });
}
