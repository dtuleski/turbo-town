import 'package:dashden_mobile/api/stats_models.dart';
import 'package:dashden_mobile/ui/screens/achievements_screen.dart';
import 'package:dashden_mobile/ui/screens/contact_screen.dart';
import 'package:dashden_mobile/ui/screens/dashboard_screen.dart';
import 'package:dashden_mobile/ui/screens/history_screen.dart';
import 'package:dashden_mobile/ui/screens/hub_screen.dart';
import 'package:dashden_mobile/ui/screens/quest_map_screen.dart';
import 'package:dashden_mobile/ui/screens/leaderboard_screen.dart';
import 'package:dashden_mobile/ui/screens/profile_screen.dart';
import 'package:dashden_mobile/ui/screens/statistics_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/fake_stats_apis.dart';
import '../helpers/pump_app.dart';
import '../helpers/pump_router.dart';

Future<void> settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
  await tester.pump(const Duration(milliseconds: 100));
}

List<LeaderboardEntry> sampleHistory() => [
      entry(rank: 1, score: 5200, gameType: 'MEMORY_MATCH', difficulty: 'hard', accuracy: 1.0, time: 20),
      entry(rank: 2, score: 900, gameType: 'SUDOKU', accuracy: 0.6),
      entry(rank: 3, score: 700, gameType: 'HANGMAN', accuracy: 0.5),
    ];

void main() {
  group('DashboardScreen', () {
    testWidgets('shows totals, rank and trend', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const DashboardScreen(),
        overrides: featureOverrides(
          stats: FakeStatsApi(statistics: stats(games: 3)),
          leaderboard: FakeLeaderboardApi(
            history: sampleHistory(),
            rank: const UserRank(rank: 4, score: 5200, totalPlayers: 120, percentile: 92),
          ),
        ),
      );
      await settle(tester);
      expect(find.text('Total Games'), findsOneWidget);
      expect(find.text('5,200'), findsWidgets);
      expect(find.byKey(const Key('rank-value')), findsOneWidget);
      expect(find.text('#4'), findsOneWidget);
      expect(find.text('Top 10%! 🌟'), findsOneWidget);
      expect(find.byKey(const Key('link-statistics')), findsOneWidget);
    });

    testWidgets('empty: zero totals and a play-to-rank hint', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const DashboardScreen(),
        overrides: featureOverrides(
          stats: FakeStatsApi(statistics: stats(games: 0, best: 0)),
        ),
      );
      await settle(tester);
      expect(find.byKey(const Key('rank-empty')), findsOneWidget);
      expect(find.text('0'), findsWidgets);
    });

    testWidgets('error: both halves failing shows retry', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const DashboardScreen(),
        overrides: featureOverrides(
          stats: FakeStatsApi(fail: true),
          leaderboard: FakeLeaderboardApi(failHistory: true),
        ),
      );
      await settle(tester);
      expect(find.text('Failed to load statistics. Please try again.'), findsOneWidget);
      expect(find.byType(FilledButton), findsOneWidget);
    });
  });

  group('StatisticsScreen', () {
    testWidgets('data: summary, charts and personal bests', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        StatisticsScreen(now: DateTime.now()),
        overrides: featureOverrides(
          leaderboard: FakeLeaderboardApi(history: sampleHistory()),
        ),
      );
      await settle(tester);
      expect(find.text('Games Played'), findsWidgets);
      expect(find.byKey(const Key('chart-weekly')), findsOneWidget);
      expect(find.byKey(const Key('chart-progression')), findsOneWidget);
      expect(find.byKey(const Key('best-MEMORY_MATCH')), findsOneWidget);
    });

    testWidgets('filter by game keeps only that game in bests chart data', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        StatisticsScreen(now: DateTime.now()),
        overrides: featureOverrides(
          leaderboard: FakeLeaderboardApi(history: sampleHistory()),
        ),
      );
      await settle(tester);
      await tester.tap(find.byKey(const Key('stats-game-filter')));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.textContaining('Sudoku').last);
      await tester.pump(const Duration(milliseconds: 300));
      // One game left: progression needs two points.
      expect(find.byKey(const Key('chart-progression')), findsNothing);
    });

    testWidgets('empty', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        StatisticsScreen(now: DateTime.now()),
        overrides: featureOverrides(
          stats: FakeStatsApi(fail: true),
          leaderboard: FakeLeaderboardApi(history: const []),
        ),
      );
      await settle(tester);
      expect(find.text('No Data Yet'), findsOneWidget);
    });

    testWidgets('error', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        StatisticsScreen(now: DateTime.now()),
        overrides: featureOverrides(
          stats: FakeStatsApi(fail: true),
          leaderboard: FakeLeaderboardApi(failHistory: true),
        ),
      );
      await settle(tester);
      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.byType(FilledButton), findsOneWidget);
    });
  });

  group('HistoryScreen', () {
    testWidgets('data: rows, personal best badge, paging and filters', (tester) async {
      useTallSurface(tester);
      final many = [
        for (var i = 1; i <= 12; i++)
          entry(rank: i, score: 100 * i, gameType: i.isEven ? 'SUDOKU' : 'MEMORY_MATCH'),
      ];
      await pumpApp(
        tester,
        const HistoryScreen(),
        overrides: featureOverrides(leaderboard: FakeLeaderboardApi(history: many)),
      );
      await settle(tester);
      expect(find.text('1–10 of 12'), findsOneWidget);
      expect(find.textContaining('PB'), findsNothing); // bests are on page 2
      await tester.tap(find.byKey(const Key('history-next')));
      await tester.pump();
      expect(find.text('11–12 of 12'), findsOneWidget);
      expect(find.textContaining('PB'), findsNWidgets(2));
      await tester.tap(find.byKey(const Key('history-difficulty-filter')));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('Hard').last);
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byKey(const Key('history-no-match')), findsOneWidget);
    });

    testWidgets('empty', (tester) async {
      await pumpApp(
        tester,
        const HistoryScreen(),
        overrides: featureOverrides(),
      );
      await settle(tester);
      expect(find.text('No Games Yet'), findsOneWidget);
    });

    testWidgets('error', (tester) async {
      await pumpApp(
        tester,
        const HistoryScreen(),
        overrides: featureOverrides(leaderboard: FakeLeaderboardApi(failHistory: true)),
      );
      await settle(tester);
      expect(find.text('Failed to load game history. Please try again.'), findsOneWidget);
    });
  });

  group('AchievementsScreen', () {
    testWidgets('data: unlocked count and progress', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const AchievementsScreen(),
        overrides: featureOverrides(
          leaderboard: FakeLeaderboardApi(history: sampleHistory()),
        ),
      );
      await settle(tester);
      expect(find.text('First Game'), findsOneWidget);
      expect(find.byKey(const Key('ach-first-game')), findsOneWidget);
      expect(find.textContaining('unlocked'), findsOneWidget);
      expect(find.text('3/10'), findsOneWidget); // On Fire progress
    });

    testWidgets('empty: nothing unlocked', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const AchievementsScreen(),
        overrides: featureOverrides(),
      );
      await settle(tester);
      expect(find.text('0/${30} unlocked'), findsOneWidget);
    });

    testWidgets('error', (tester) async {
      await pumpApp(
        tester,
        const AchievementsScreen(),
        overrides: featureOverrides(leaderboard: FakeLeaderboardApi(failHistory: true)),
      );
      await settle(tester);
      expect(find.byType(FilledButton), findsOneWidget);
    });
  });

  group('LeaderboardScreen', () {
    testWidgets('data: own rank, rows, switching timeframe refetches', (tester) async {
      useTallSurface(tester);
      final api = FakeLeaderboardApi(
        board: LeaderboardResult(
          entries: [
            entry(rank: 1, username: 'zed', score: 9000),
            entry(rank: 2, username: 'me', score: 8000, me: true),
          ],
          currentUserEntry: entry(rank: 2, username: 'me', score: 8000, me: true),
          totalEntries: 2,
        ),
      );
      await pumpApp(
        tester,
        const LeaderboardScreen(),
        overrides: featureOverrides(leaderboard: api),
      );
      await settle(tester);
      expect(api.boardCalls, ['OVERALL:WEEKLY']);
      expect(find.byKey(const Key('lb-me')), findsOneWidget);
      expect(find.text('zed'), findsOneWidget);
      expect(find.text('me (You)'), findsOneWidget);
      await tester.tap(find.byKey(const Key('lb-allTime')));
      await settle(tester);
      expect(api.boardCalls.last, 'OVERALL:ALL_TIME');
    });

    testWidgets('empty', (tester) async {
      await pumpApp(
        tester,
        const LeaderboardScreen(),
        overrides: featureOverrides(),
      );
      await settle(tester);
      expect(find.byKey(const Key('lb-empty')), findsOneWidget);
      expect(find.byKey(const Key('lb-me')), findsNothing);
    });

    testWidgets('error', (tester) async {
      await pumpApp(
        tester,
        const LeaderboardScreen(),
        overrides: featureOverrides(leaderboard: FakeLeaderboardApi(failBoard: true)),
      );
      await settle(tester);
      expect(find.text('Failed to load leaderboard. Please try again later.'), findsOneWidget);
    });
  });

  group('ProfileScreen', () {
    testWidgets('data: user, tier and digest toggle saves', (tester) async {
      useTallSurface(tester);
      final profile = FakeProfileApi();
      await pumpApp(
        tester,
        const ProfileScreen(),
        gameApi: FakeGameApi(),
        overrides: featureOverrides(profile: profile),
      );
      await settle(tester);
      expect(find.text('tester'), findsOneWidget);
      expect(find.text('test@dashden.app'), findsOneWidget);
      await tester.tap(find.byKey(const Key('digest-switch')));
      await settle(tester);
      expect(profile.saves, [true]);
      expect(find.byKey(const Key('prefs-save-failed')), findsNothing);
    });

    testWidgets('delete account: cancel keeps the account', (tester) async {
      useTallSurface(tester);
      final profile = FakeProfileApi();
      await pumpApp(tester, const ProfileScreen(), overrides: featureOverrides(profile: profile));
      await settle(tester);
      await tester.ensureVisible(find.byKey(const Key('profile-delete-account')));
      await tester.tap(find.byKey(const Key('profile-delete-account')));
      await settle(tester);
      expect(find.byKey(const Key('delete-confirm-dialog')), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await settle(tester);
      expect(profile.deletes, 0);
    });

    testWidgets('delete account: confirm deletes and shows the done dialog', (tester) async {
      useTallSurface(tester);
      final profile = FakeProfileApi();
      await pumpApp(tester, const ProfileScreen(), overrides: featureOverrides(profile: profile));
      await settle(tester);
      await tester.ensureVisible(find.byKey(const Key('profile-delete-account')));
      await tester.tap(find.byKey(const Key('profile-delete-account')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('delete-confirm-button')));
      await settle(tester);
      expect(profile.deletes, 1);
      expect(find.byKey(const Key('deleted-dialog')), findsOneWidget);
      expect(find.text('Your account and data have been deleted.'), findsOneWidget);
      expect(find.byKey(const Key('deleted-manage-subscriptions')), findsNothing);
      await tester.tap(find.byKey(const Key('deleted-ok')));
      await settle(tester);
    });

    testWidgets('delete account: an active App Store plan gets the cancel reminder', (tester) async {
      useTallSurface(tester);
      final profile = FakeProfileApi(appleActive: true);
      await pumpApp(tester, const ProfileScreen(), overrides: featureOverrides(profile: profile));
      await settle(tester);
      await tester.ensureVisible(find.byKey(const Key('profile-delete-account')));
      await tester.tap(find.byKey(const Key('profile-delete-account')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('delete-confirm-button')));
      await settle(tester);
      expect(find.byKey(const Key('deleted-manage-subscriptions')), findsOneWidget);
      expect(find.textContaining('App Store subscription is still active'), findsOneWidget);
    });

    testWidgets('delete account: a failure keeps the user on the screen', (tester) async {
      useTallSurface(tester);
      final profile = FakeProfileApi(failDelete: true);
      await pumpApp(tester, const ProfileScreen(), overrides: featureOverrides(profile: profile));
      await settle(tester);
      await tester.ensureVisible(find.byKey(const Key('profile-delete-account')));
      await tester.tap(find.byKey(const Key('profile-delete-account')));
      await settle(tester);
      await tester.tap(find.byKey(const Key('delete-confirm-button')));
      await settle(tester);
      expect(find.byKey(const Key('delete-failed')), findsOneWidget);
      expect(find.byKey(const Key('deleted-dialog')), findsNothing);
      expect(find.byKey(const Key('profile-delete-account')), findsOneWidget);
    });

    testWidgets('empty: preferences off by default', (tester) async {
      useTallSurface(tester);
      await pumpApp(tester, const ProfileScreen(), overrides: featureOverrides());
      await settle(tester);
      expect(tester.widget<SwitchListTile>(find.byKey(const Key('digest-switch'))).value, isFalse);
    });

    testWidgets('error: load and save failures are shown', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const ProfileScreen(),
        overrides: featureOverrides(profile: FakeProfileApi(failLoad: true)),
      );
      await settle(tester);
      expect(find.byKey(const Key('prefs-load-failed')), findsOneWidget);

      await pumpApp(
        tester,
        const ProfileScreen(),
        overrides: featureOverrides(profile: FakeProfileApi(failSave: true)),
      );
      await settle(tester);
      await tester.tap(find.byKey(const Key('digest-switch')));
      await settle(tester);
      expect(find.byKey(const Key('prefs-save-failed')), findsOneWidget);
      expect(tester.widget<SwitchListTile>(find.byKey(const Key('digest-switch'))).value, isFalse);
    });
  });

  group('ContactScreen', () {
    testWidgets('data: send is disabled until filled, then submits', (tester) async {
      useTallSurface(tester);
      final profile = FakeProfileApi();
      await pumpApp(tester, const ContactScreen(), overrides: featureOverrides(profile: profile));
      await settle(tester);
      expect(tester.widget<FilledButton>(find.byKey(const Key('contact-send'))).onPressed, isNull);
      await tester.tap(find.byKey(const Key('contact-type-feature')));
      await tester.enterText(find.byKey(const Key('contact-subject')), ' Idea ');
      await tester.enterText(find.byKey(const Key('contact-message')), 'More games');
      await tester.pump();
      await tester.tap(find.byKey(const Key('contact-send')));
      await settle(tester);
      expect(profile.contacts.single.type, ContactType.feature);
      expect(profile.contacts.single.subject, 'Idea');
      expect(find.byKey(const Key('contact-sent')), findsOneWidget);
    });

    testWidgets('empty: whitespace-only input cannot be sent', (tester) async {
      useTallSurface(tester);
      await pumpApp(tester, const ContactScreen(), overrides: featureOverrides());
      await tester.enterText(find.byKey(const Key('contact-subject')), '   ');
      await tester.enterText(find.byKey(const Key('contact-message')), '   ');
      await tester.pump();
      expect(tester.widget<FilledButton>(find.byKey(const Key('contact-send'))).onPressed, isNull);
    });

    testWidgets('error: failed send shows the message and keeps the form', (tester) async {
      useTallSurface(tester);
      await pumpApp(
        tester,
        const ContactScreen(),
        overrides: featureOverrides(profile: FakeProfileApi(failContact: true)),
      );
      await tester.enterText(find.byKey(const Key('contact-subject')), 'Hi');
      await tester.enterText(find.byKey(const Key('contact-message')), 'There');
      await tester.pump();
      await tester.tap(find.byKey(const Key('contact-send')));
      await settle(tester);
      expect(find.byKey(const Key('contact-error')), findsOneWidget);
      expect(find.byKey(const Key('contact-subject')), findsOneWidget);
    });
  });

  group('Tab navigation', () {
    for (final lang in ['en', 'es', 'pt']) {
      testWidgets('each tab route renders in $lang', (tester) async {
        useTallSurface(tester);
        final h = await pumpRouterApp(
          tester,
          location: '/',
          locale: Locale(lang),
          overrides: featureOverrides(),
        );
        expect(find.byKey(const Key('main-nav')), findsOneWidget);
        for (final tab in ['quest', 'dashboard', 'leaderboard', 'profile', 'hub']) {
          await tester.tap(find.byKey(Key('tab-$tab')));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 400));
          final path = {
            'hub': '/',
            'quest': '/quest-map',
            'dashboard': '/dashboard',
            'leaderboard': '/leaderboard',
            'profile': '/profile',
          }[tab]!;
          expect(
            h.router.routerDelegate.currentConfiguration.uri.path,
            path,
            reason: '$tab in $lang',
          );
          expect(find.byKey(const Key('main-nav')), findsOneWidget);
          final screen = {
            'hub': HubScreen,
            'quest': QuestMapScreen,
            'dashboard': DashboardScreen,
            'leaderboard': LeaderboardScreen,
            'profile': ProfileScreen,
          }[tab]!;
          expect(find.byType(screen), findsOneWidget, reason: '$tab in $lang');
        }
        // Detail screens and contact are reachable and sit outside the tabs.
        for (final path in ['/statistics', '/history', '/achievements', '/contact']) {
          h.router.go(path);
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 400));
          await tester.pump(const Duration(milliseconds: 400));
          expect(find.byKey(const Key('main-nav')), findsNothing, reason: path);
          expect(find.byType(Scaffold), findsWidgets);
        }
      });
    }
  });
}
