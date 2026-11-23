import 'package:dashden_mobile/api/quest_models.dart';
import 'package:dashden_mobile/game/framework/game_session.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

QuestNodeView _node(
  String id, {
  String kind = 'GAME',
  String status = 'AVAILABLE',
  int stars = 0,
  int best = 0,
  required double x,
  required double y,
  List<LegView> legs = const [LegView(themeId: 'ANIMALS', difficulty: 1)],
}) =>
    QuestNodeView(
      id: id,
      kind: kind,
      status: status,
      stars: stars,
      bestScore: best,
      thresholds: const [1450, 2750, 3000],
      mapX: x,
      mapY: y,
      legs: legs,
    );

QuestProgressView _progress({bool scienceOpen = false}) => QuestProgressView(
      tier: 'FREE',
      rateLimit: const QuestRateLimitView(limit: 10, used: 4, remaining: 6),
      worlds: [
        QuestWorldView(
          id: 'brain-peaks',
          order: 1,
          accessible: true,
          totalStars: 3,
          maxStars: 30,
          badges: const ['WORLD_CLEARED'],
          nodes: [
            _node('bp-01-memory', stars: 3, best: 3000, x: 20, y: 92),
            _node('bp-02-math',
                x: 60,
                y: 84,
                legs: const [LegView(themeId: 'MATH_CHALLENGE', difficulty: 1)]),
            _node('bp-03-words', status: 'LOCKED', x: 80, y: 70),
            // A game the app does not know (for example one the server adds later).
            _node('bp-05-sequence',
                x: 40,
                y: 60,
                legs: const [LegView(themeId: 'TRAFFIC_LAB', difficulty: 1)]),
            _node('bp-boss', kind: 'BOSS', status: 'LOCKED', x: 50, y: 20),
            _node('bp-bonus-sequence', kind: 'BONUS', status: 'LOCKED', x: 20, y: 10),
          ],
        ),
        QuestWorldView(
          id: 'science-island',
          order: 2,
          accessible: scienceOpen,
          totalStars: 0,
          maxStars: 30,
          badges: const [],
          nodes: [
            _node('si-01-bond-burn',
                x: 30,
                y: 90,
                legs: const [LegView(themeId: 'BOND_AND_BURN', difficulty: 1)]),
          ],
        ),
      ],
    );

void main() {
  testWidgets('shows worlds, stars, badges and plays left from getQuestProgress',
      (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(questProgress: _progress());
    await pumpRouterApp(tester, location: '/quest-map', api: api);
    await tester.pump(const Duration(milliseconds: 300));

    expect(api.calls, contains('getQuestProgress'));
    expect(find.text('Brain Peaks'), findsOneWidget);
    expect(find.text('Science Island'), findsOneWidget);
    expect(find.text('★ 3 of 30 stars'), findsOneWidget);
    expect(find.text('6 plays left today'), findsOneWidget);
    final cleared = find.byKey(const Key('badge-brain-peaks-WORLD_CLEARED'));
    final mastered = find.byKey(const Key('badge-brain-peaks-WORLD_MASTERED'));
    expect(find.descendant(of: cleared, matching: find.text('World Cleared · Earned')),
        findsOneWidget);
    expect(find.descendant(of: mastered, matching: find.text('World Mastered · Locked')),
        findsOneWidget);
    expect(find.byKey(const Key('node-bp-01-memory')), findsOneWidget);
    expect(find.byKey(const Key('node-bp-bonus-sequence')), findsOneWidget);
    // World 2 is closed to this user: neutral note, no purchase link.
    expect(find.byKey(const Key('world-locked-science-island')), findsOneWidget);
    expect(find.textContaining(RegExp(r'\$|Stripe|Subscribe', caseSensitive: false)),
        findsNothing);
  });

  testWidgets('a Memory Match node opens a panel whose play button launches the quest',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/quest-map',
      api: FakeGameApi(questProgress: _progress()),
    );
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.byKey(const Key('node-bp-01-memory')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('node-panel')), findsOneWidget);
    expect(find.text('Animal Memory'), findsWidgets);
    expect(find.text('Replay'), findsOneWidget);
    expect(find.text('Best: 3000'), findsOneWidget);

    await tester.tap(find.byKey(const Key('node-play')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    // The game page opened and the round started with the quest context.
    expect(find.byKey(const Key('stat-time')), findsOneWidget);
    expect(h.api.calls, contains('startGame:ANIMALS:1:brain-peaks:bp-01-memory:0'));
  });

  testWidgets('a node whose game has app screens can be launched with its quest context',
      (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/quest-map',
      api: FakeGameApi(questProgress: _progress()),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.byKey(const Key('node-bp-02-math')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('node-not-in-app')), findsNothing);
    await tester.tap(find.byKey(const Key('node-play')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));
    expect(h.api.calls, contains('startGame:MATH_CHALLENGE:1:brain-peaks:bp-02-math:0'));
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets('a node whose game the app does not know cannot be launched',
      (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(
      tester,
      location: '/quest-map',
      api: FakeGameApi(questProgress: _progress()),
    );
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.byKey(const Key('node-bp-05-sequence')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    // Every known game has screens now (FEAT-008), so the "not in the app yet"
    // note cannot appear; an unknown game simply has no Play.
    expect(find.byKey(const Key('node-not-in-app')), findsNothing);
    final play = tester.widget<FilledButton>(find.byKey(const Key('node-play')));
    expect(play.onPressed, isNull);
  });

  testWidgets('locked nodes and closed worlds show why', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(
      tester,
      location: '/quest-map',
      api: FakeGameApi(questProgress: _progress()),
    );
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.byKey(const Key('node-bp-03-words')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Earn a star on the previous node to unlock.'), findsOneWidget);
    expect(find.byKey(const Key('node-play')), findsNothing);
    await tester.tapAt(const Offset(10, 10)); // dismiss the sheet
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    await tester.ensureVisible(find.byKey(const Key('node-si-01-bond-burn')));
    await tester.tap(find.byKey(const Key('node-si-01-bond-burn')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('This world is not available in the app yet.'), findsWidgets);
    expect(find.byKey(const Key('node-play')), findsNothing);
  });

  testWidgets('shows a notice after a rejected quest start', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(
      tester,
      location: '/quest-map?startFailed=quest',
      api: FakeGameApi(questProgress: _progress()),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const Key('quest-notice')), findsOneWidget);
  });

  testWidgets('unlock highlights from the last result show once', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(
      tester,
      location: '/',
      api: FakeGameApi(questProgress: _progress()),
    );
    h.container.read(questResultProvider.notifier).state = const QuestResult(
      worldId: 'brain-peaks',
      nodeId: 'bp-01-memory',
      kind: 'GAME',
      score: 3000,
      thresholds: [1450, 2750, 3000],
      stars: 3,
      bestStars: 3,
      newlyUnlocked: ['bp-02-math'],
      worldCleared: false,
      badgesAwarded: ['WORLD_CLEARED'],
    );
    h.router.go('/quest-map');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('New'), findsOneWidget); // the unlocked node tag
    expect(find.textContaining('World Cleared · Earned · New'), findsOneWidget);
    // The store is cleared so the highlights do not repeat.
    expect(h.container.read(questResultProvider), isNull);
  });

  testWidgets('a failed load shows retry', (tester) async {
    useTallSurface(tester);
    final api = _FailingQuestApi();
    await pumpRouterApp(tester, location: '/quest-map', api: api);
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('We could not load the Quest Map.'), findsOneWidget);
    api.fail = false;
    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Brain Peaks'), findsOneWidget);
  });
}

class _FailingQuestApi extends FakeGameApi {
  _FailingQuestApi() : super(questProgress: _progress());

  bool fail = true;

  @override
  Future<QuestProgressView> getQuestProgress() async {
    if (fail) throw StateError('down');
    return super.getQuestProgress();
  }
}
