import 'package:dashden_mobile/api/game_models.dart';
import 'package:dashden_mobile/game/bond_and_burn/bond_controller.dart';
import 'package:dashden_mobile/game/bond_and_burn/logic.dart';
import 'package:dashden_mobile/game/game_registry.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/board_flow.dart';
import '../helpers/fake_game_api.dart';
import '../helpers/pump_router.dart';

BondArgs _args(String d) => (difficulty: d, quest: null);

BondState _state(RouterHarness h, [String d = 'easy']) => h.container.read(bondControllerProvider(_args(d)));
BondController _ctrl(RouterHarness h, [String d = 'easy']) =>
    h.container.read(bondControllerProvider(_args(d)).notifier);

Future<void> _tap(WidgetTester tester, String symbol) async {
  await tester.tap(find.byKey(Key('bond-el-$symbol')));
  await tester.pump(const Duration(milliseconds: 50));
}

/// Taps every ingredient of the current recipe.
Future<void> _build(WidgetTester tester, RouterHarness h, [String d = 'easy']) async {
  final recipe = _state(h, d).recipe;
  for (final ing in recipe.ingredients) {
    for (var i = 0; i < ing.count; i++) {
      await _tap(tester, ing.symbol);
    }
  }
}

void main() {
  test('the registry marks Bond & Burn playable and paid', () {
    final e = gameById('bond-and-burn')!;
    expect(e.implemented, isTrue);
    expect(e.isPaid, isTrue);
    expect(e.playRoute, '/bond-and-burn/play');
  });

  testWidgets('setup -> build every recipe -> server score', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(4321);
    });
    final h = await pumpRouterApp(tester, location: '/bond-and-burn/setup', api: api);
    expect(find.text('Bond & Burn'), findsWidgets);
    expect(find.text('How to Play'), findsOneWidget);
    await chooseAndStart(tester, ['difficulty-easy']);
    expect(api.calls, contains('startGame:BOND_AND_BURN:1'));
    final total = _state(h).recipes.length;
    expect(total, 3, reason: 'easy has three recipes');
    expect(find.text('Round 1/3'), findsOneWidget);

    var taps = 0;
    for (var round = 0; round < total; round++) {
      expect(_state(h).recipeIndex, round);
      expect(find.byKey(const Key('bond-recipe')), findsOneWidget);
      taps += _state(h).recipe.totalIngredients;
      await _build(tester, h);
      expect(_state(h).phase, BondPhase.reacting);
      expect(find.byKey(const Key('bond-reaction')), findsOneWidget);
      await pumpFor(tester, kReactionDelay + const Duration(milliseconds: 100));
      expect(find.byKey(const Key('bond-funfact')), findsOneWidget);
      expect(_state(h).roundsCompleted, round + 1);
      await pumpFor(tester, kFunFactDelay);
    }
    expect(_state(h).phase, BondPhase.complete);
    expect(find.byKey(const Key('bond-complete')), findsOneWidget);
    await pumpFor(tester, kLabCompleteDelay + const Duration(milliseconds: 300));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(find.text('4321'), findsOneWidget);
    expect(sent, {'correctAnswers': 3, 'totalQuestions': 3});
    expect(api.calls.last, endsWith(':$taps'), reason: 'attempts = every drop');
  });

  testWidgets('a wrong element adds heat, breaks the combo and is counted', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final recipe = _state(h).recipe;
    final wrong = ['H', 'O', 'C', 'N', 'Na', 'Cl'].firstWhere((s) => recipe.ingredients.every((i) => i.symbol != s));
    await _tap(tester, wrong);
    final s = _state(h);
    expect(s.heat, greaterThanOrEqualTo(bondConfig('easy').heatPenaltyWrong));
    expect(s.combo, 1);
    expect(s.chamber, isEmpty);
    expect(s.totalAttempts, 1);
    expect(s.wrongSymbol, wrong);
    await pumpFor(tester, kWrongPickDelay + const Duration(milliseconds: 100));
    expect(_state(h).wrongSymbol, isNull);
    // Too many of a right element is wrong as well.
    final first = recipe.ingredients.first;
    for (var i = 0; i < first.count; i++) {
      await _tap(tester, first.symbol);
    }
    final before = _state(h).heat;
    if (recipe.ingredients.length > 1) {
      await _tap(tester, first.symbol);
      expect(_state(h).heat, greaterThan(before));
      expect(_state(h).chamber.length, first.count);
    }
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a long press drags an element into the flask', (tester) async {
    useTallSurface(tester);
    final h = await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=easy');
    await tester.pump(const Duration(milliseconds: 100));
    final symbol = _state(h).recipe.ingredients.first.symbol;
    final gesture = await tester.startGesture(tester.getCenter(find.byKey(Key('bond-el-$symbol'))));
    await tester.pump(const Duration(milliseconds: 300));
    await gesture.moveTo(tester.getCenter(find.byKey(const Key('bond-flask'))));
    await tester.pump(const Duration(milliseconds: 100));
    await gesture.up();
    await tester.pump(const Duration(milliseconds: 100));
    expect(_state(h).chamber, [symbol]);
    expect(find.byKey(const Key('bond-atom-0')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the heat rises while playing and a meltdown ends the round', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(55);
    });
    final h = await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=hard', api: api);
    await tester.pump(const Duration(milliseconds: 100));
    // The ticker steps once per 100 ms: 3 seconds of hard heat (4.5 per second).
    await pumpFor(tester, const Duration(seconds: 3));
    expect(_state(h, 'hard').heat, closeTo(13.5, 1.0));
    expect(find.byKey(const Key('bond-heat')), findsOneWidget);

    final ctrl = _ctrl(h, 'hard');
    for (var i = 0; i < 400 && _state(h, 'hard').phase == BondPhase.playing; i++) {
      ctrl.tick();
    }
    expect(_state(h, 'hard').phase, BondPhase.meltdown);
    expect(_state(h, 'hard').heat, 100);
    await tester.pump();
    expect(find.byKey(const Key('bond-meltdown')), findsOneWidget);
    await pumpFor(tester, kMeltdownDelay + const Duration(milliseconds: 400));
    expect(find.byKey(const Key('result-score')), findsOneWidget);
    expect(sent, {'correctAnswers': 0, 'totalQuestions': 5});
  });

  testWidgets('recipes done before a meltdown still count', (tester) async {
    useTallSurface(tester);
    Map<String, dynamic>? sent;
    final api = FakeGameApi(onCompleteGame: (id, time, attempts, extra) async {
      sent = extra;
      return serverResult(70);
    });
    final h = await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=easy', api: api);
    await tester.pump(const Duration(milliseconds: 100));
    await _build(tester, h);
    await pumpFor(tester, kReactionDelay + kFunFactDelay + const Duration(milliseconds: 300));
    expect(_state(h).recipeIndex, 1);
    final ctrl = _ctrl(h);
    for (var i = 0; i < 1000 && _state(h).phase == BondPhase.playing; i++) {
      ctrl.tick();
    }
    expect(_state(h).phase, BondPhase.meltdown);
    await pumpFor(tester, kMeltdownDelay + const Duration(milliseconds: 400));
    expect(sent, {'correctAnswers': 1, 'totalQuestions': 3});
  });

  testWidgets('hard shows the wider table; easy fades the non-game elements', (tester) async {
    useTallSurface(tester);
    await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=hard');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('bond-el-Br')), findsOneWidget, reason: 'row 4 is on the hard table');
    expect(find.byKey(const Key('bond-el-Na')), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=bogus');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('bond-el-Br')), findsNothing, reason: 'an unknown difficulty is easy');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('a quest launch sends the context', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi();
    await pumpRouterApp(
      tester,
      location: '/bond-and-burn/play?difficulty=medium&quest=science-isle:si-01-bond-burn:0',
      api: api,
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(api.calls, contains('startGame:BOND_AND_BURN:2:science-isle:si-01-bond-burn:0'));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the paid backend answer shows the neutral unavailable page', (tester) async {
    useTallSurface(tester);
    final api = FakeGameApi(
      onStartGame: (_, __, ___) async => throw GameApiException('This game requires a paid subscription', code: 'AUTHZ_TIER_REQUIRED'),
    );
    await pumpRouterApp(tester, location: '/bond-and-burn/play?difficulty=easy', api: api);
    await settleStart(tester);
    expect(find.text('Not available in the app yet'), findsWidgets);
    expect(find.byKey(const Key('bond-heat')), findsNothing);
  });
}
