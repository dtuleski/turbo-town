import 'package:dashden_mobile/api/challenge_models.dart';
import 'package:dashden_mobile/api/game_providers.dart';
import 'package:dashden_mobile/challenge/challenge_launch.dart';
import 'package:dashden_mobile/ui/screens/challenge_results_screen.dart';
import 'package:dashden_mobile/ui/screens/games/sudoku_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/challenge_fixtures.dart';
import '../helpers/fake_stats_apis.dart';
import '../helpers/pump_app.dart';
import '../helpers/pump_router.dart';

ChallengeLeaderboardView _board({
  String day = kTestDay,
  String gameId = 'sudoku',
  bool isFinal = false,
  int count = 7,
  ChallengeMyEntry? me,
}) =>
    ChallengeLeaderboardView(
      day: day,
      gameId: gameId,
      themeId: kChallengeThemes[gameId] ?? 'SUDOKU',
      isFinal: isFinal,
      entries: [
        for (var i = 1; i <= count; i++)
          ChallengeEntry(
            rank: i,
            username: 'player$i',
            score: 1000 - i * 10,
            achievedAt: '2026-11-26T15:00:00.000Z',
            isMe: i == 3,
          ),
      ],
      me: me,
    );

DailyChallengeView _challenge({ChallengeMyEntry? me}) {
  final json = dailyChallengeJson(sudokuContentJson());
  if (me != null) {
    json['me'] = {'bestScore': me.bestScore, 'rank': me.rank, 'achievedAt': me.achievedAt};
  }
  return DailyChallengeView.fromJson(json)!;
}

const _me = ChallengeMyEntry(bestScore: 970, rank: 3, achievedAt: '2026-11-26T15:00:00.000Z');

Future<RouterHarness> _hub(WidgetTester tester, FakeChallengeApi api, {String location = '/'}) {
  useTallSurface(tester);
  return pumpRouterApp(
    tester,
    location: location,
    challengeApi: api,
    overrides: featureOverrides(),
  );
}

String _location(RouterHarness h) => h.router.routerDelegate.currentConfiguration.uri.toString();

void main() {
  group('launch paths', () {
    test('a challenge with an app mode gets its medium play path', () {
      expect(buildChallengePath(_challenge()), '/sudoku/play?difficulty=medium&challenge=$kTestDay');
      for (final gameId in kChallengeThemes.keys) {
        final view = dailyChallengeView(switch (gameId) {
          'code-a-bot' => codeABotContentJson(),
          'sudoku' => sudokuContentJson(),
          'math-challenge' => mathContentJson(),
          'math-maze' => mazeContentJson(),
          'word-puzzle' => wordPuzzleContentJson(),
          _ => hangmanContentJson(),
        });
        expect(buildChallengePath(view), '/$gameId/play?difficulty=medium&challenge=$kTestDay', reason: gameId);
      }
    });

    test('a theme without an app challenge mode has no play path', () {
      final c = _challenge();
      final other = DailyChallengeView(
        day: c.day,
        gameId: 'geo-quiz',
        themeId: 'GEO_QUIZ',
        difficulty: 2,
        settings: const {},
        content: c.content,
        endsAt: c.endsAt,
      );
      expect(buildChallengePath(other), isNull);
      expect(challengeResultsPath(kTestDay), '/challenge/results?day=$kTestDay');
    });
  });

  group('hub card', () {
    testWidgets('shows the game, Play, not played yet and the top 5 above the quest card', (tester) async {
      final api = FakeChallengeApi(_challenge(), _board());
      await _hub(tester, api);
      expect(find.byKey(const Key('daily-challenge-card')), findsOneWidget);
      expect(find.text('⭐ Daily Challenge'), findsOneWidget);
      expect(find.byKey(const Key('daily-challenge-game')), findsOneWidget);
      expect(find.text("You have not played today's challenge yet."), findsOneWidget);
      expect(find.byKey(const Key('daily-challenge-play')), findsOneWidget);
      for (var i = 1; i <= 5; i++) {
        expect(find.byKey(Key('daily-challenge-entry-$i')), findsOneWidget);
      }
      expect(find.byKey(const Key('daily-challenge-entry-6')), findsNothing);
      expect(find.text('#3 player3 (you)'), findsOneWidget);
      expect(api.leaderboardCalls.single, (day: null, limit: 5));
      final card = tester.getTopLeft(find.byKey(const Key('daily-challenge-card')));
      final quest = tester.getTopLeft(find.byKey(const Key('quest-card')));
      expect(card.dy, lessThan(quest.dy));
    });

    testWidgets('shows the best score and rank once played', (tester) async {
      await _hub(tester, FakeChallengeApi(_challenge(me: _me), _board()));
      expect(find.text('Your best today: 970 (rank #3)'), findsOneWidget);
    });

    testWidgets('shows the challenge without a top 5 when the board is for another day', (tester) async {
      await _hub(tester, FakeChallengeApi(_challenge(), _board(day: '2026-11-25')));
      expect(find.byKey(const Key('daily-challenge-card')), findsOneWidget);
      expect(find.byKey(const Key('daily-challenge-entry-1')), findsNothing);
    });

    testWidgets('an empty board invites the first score', (tester) async {
      await _hub(tester, FakeChallengeApi(_challenge(), _board(count: 0)));
      expect(find.byKey(const Key('daily-challenge-no-scores')), findsOneWidget);
    });

    testWidgets('is hidden when the challenge is off or fails', (tester) async {
      await _hub(tester, FakeChallengeApi());
      expect(find.byKey(const Key('daily-challenge-card')), findsNothing);
      expect(find.byKey(const Key('daily-challenge-failed')), findsNothing);
      expect(find.byKey(const Key('quest-card')), findsOneWidget);
    });

    testWidgets('a failed challenge start shows the notice even without the card', (tester) async {
      await _hub(tester, FakeChallengeApi(), location: kChallengeFailedPath);
      expect(find.byKey(const Key('daily-challenge-failed')), findsOneWidget);
      expect(find.text('This challenge is not available right now.'), findsOneWidget);
    });

    testWidgets('Play opens the challenge game route', (tester) async {
      final h = await _hub(tester, FakeChallengeApi(_challenge(), _board()));
      await tester.tap(find.byKey(const Key('daily-challenge-play')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      final last = h.router.routerDelegate.currentConfiguration.last;
      expect(last.matchedLocation, '/sudoku/play');
      expect(
        find.byWidgetPredicate((w) => w is SudokuGameScreen && w.challengeDay == kTestDay && w.difficulty == 'medium'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('See all results opens the results screen for today', (tester) async {
      final api = FakeChallengeApi(_challenge(), _board());
      final h = await _hub(tester, api);
      await tester.tap(find.byKey(const Key('daily-challenge-results')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(h.router.routerDelegate.currentConfiguration.last.matchedLocation, '/challenge/results');
      expect(find.byWidgetPredicate((w) => w is ChallengeResultsScreen && w.day == kTestDay), findsOneWidget);
      expect(api.leaderboardCalls.last, (day: kTestDay, limit: 10));
    });
  });

  group('results screen', () {
    Future<void> pumpResults(WidgetTester tester, FakeChallengeApi api, {String? day = '2026-11-25', Locale locale = const Locale('en')}) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        ChallengeResultsScreen(day: day),
        locale: locale,
        overrides: [challengeApiProvider.overrideWithValue(api)],
      );
      await tester.pump();
    }

    testWidgets("yesterday's final results: winner, top 10 and own rank", (tester) async {
      final api = FakeChallengeApi(null, _board(day: '2026-11-25', isFinal: true, count: 12, me: _me));
      await pumpResults(tester, api);
      expect(api.leaderboardCalls.single, (day: '2026-11-25', limit: 10));
      expect(find.text('🏆 Winner: player1 with 990 points'), findsOneWidget);
      expect(find.byKey(const Key('challenge-results-entry-10')), findsOneWidget);
      expect(find.byKey(const Key('challenge-results-entry-11')), findsNothing);
      expect(find.text('You finished #3 with 970 points.'), findsOneWidget);
      expect(find.byKey(const Key('challenge-results-live')), findsNothing);
      expect(find.textContaining('November 25, 2026'), findsOneWidget);
    });

    testWidgets('a running day says so; a player who did not play is invited', (tester) async {
      await pumpResults(tester, FakeChallengeApi(null, _board(day: '2026-11-25')));
      expect(find.byKey(const Key('challenge-results-live')), findsOneWidget);
      expect(find.textContaining('You did not play this challenge.'), findsOneWidget);
    });

    testWidgets('nobody played', (tester) async {
      await pumpResults(tester, FakeChallengeApi(null, _board(day: '2026-11-25', isFinal: true, count: 0)));
      expect(find.text('Nobody played this challenge.'), findsOneWidget);
    });

    testWidgets('no results for the day', (tester) async {
      await pumpResults(tester, FakeChallengeApi());
      expect(find.byKey(const Key('challenge-results-none')), findsOneWidget);
      expect(find.byKey(const Key('challenge-results-to-hub')), findsOneWidget);
    });

    testWidgets('Spanish texts', (tester) async {
      await pumpResults(
        tester,
        FakeChallengeApi(null, _board(day: '2026-11-25', isFinal: true, me: _me)),
        locale: const Locale('es'),
      );
      expect(find.text('Resultados del Desafío Diario'), findsOneWidget);
      expect(find.text('🏆 Ganador: player1 con 990 puntos'), findsOneWidget);
      expect(find.text('Quedaste en el puesto #3 con 970 puntos.'), findsOneWidget);
    });

    test('the day parameter must be a real calendar day', () {
      expect(resultsDayParam('2026-11-25'), '2026-11-25');
      expect(resultsDayParam('2026-13-01'), isNull);
      expect(resultsDayParam('yesterday'), isNull);
      expect(resultsDayParam(null), isNull);
    });

    testWidgets('the route reads the day; a bad day means today', (tester) async {
      final api = FakeChallengeApi(null, _board(day: '2026-11-25', isFinal: true));
      await _hub(tester, api, location: '/challenge/results?day=2026-11-25');
      expect(find.byType(ChallengeResultsScreen), findsOneWidget);
      expect(api.leaderboardCalls.last, (day: '2026-11-25', limit: 10));
      final h2 = await _hub(tester, api, location: '/challenge/results?day=bad');
      expect(find.byType(ChallengeResultsScreen), findsOneWidget);
      expect(api.leaderboardCalls.last, (day: null, limit: 10));
      expect(_location(h2), '/challenge/results?day=bad');
    });
  });

  group('profile toggle', () {
    testWidgets('shows the renamed texts', (tester) async {
      useTallSurface(tester);
      await pumpRouterApp(
        tester,
        location: '/profile',
        overrides: [...featureOverrides(profile: FakeProfileApi(digest: true))],
      );
      expect(find.text('Daily emails and notifications'), findsOneWidget);
      expect(find.text('✓ Every morning at 8am your time'), findsOneWidget);
      expect(find.textContaining('8pm'), findsNothing);
    });
  });
}
