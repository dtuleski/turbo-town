import 'package:dashden_mobile/api/game_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// A server result with a recognisable score.
CompleteGameResult serverResult(int score) => CompleteGameResult.fromJson({
      'id': 'game-1',
      'status': 'COMPLETED',
      'score': score,
      'scoreBreakdown': {
        'baseScore': 900,
        'difficultyMultiplier': 1.0,
        'speedBonus': 10,
        'accuracyBonus': 20,
        'finalScore': score,
      },
    });

/// Lets the start call finish and the board appear (same beats the other
/// game flow tests use).
Future<void> settleStart(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump(const Duration(milliseconds: 100));
}

/// Pumps [total] in [step] pieces, so timers that re-arm themselves run.
Future<void> pumpFor(
  WidgetTester tester,
  Duration total, {
  Duration step = const Duration(milliseconds: 100),
}) async {
  var left = total;
  while (left > Duration.zero) {
    final d = left < step ? left : step;
    await tester.pump(d);
    left -= d;
  }
}

/// Taps the setup option with [key], then the start button, and waits for the
/// round to begin.
Future<void> chooseAndStart(WidgetTester tester, List<String> optionKeys) async {
  for (final k in optionKeys) {
    await tester.tap(find.byKey(Key(k)));
    await tester.pump();
  }
  await tester.tap(find.byKey(const Key('game-start-button')));
  await settleStart(tester);
}
