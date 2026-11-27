// App Store screenshots, driven on a simulator against production.
//
// The test signs in, opens each screen, prints `SHOT_READY <name>` and waits; the host script
// (`scripts/store-screenshots.sh`) takes a native simulator screenshot when it sees the marker.
// Credentials come from --dart-define and are never stored in the repository:
//   SHOT_EMAIL, SHOT_PASSWORD, SHOT_CHALLENGE_PATH (for example /math-maze/play?challenge=2026-11-26)
import 'package:dashden_mobile/main.dart' as app;
import 'package:dashden_mobile/ui/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _email = String.fromEnvironment('SHOT_EMAIL');
const _password = String.fromEnvironment('SHOT_PASSWORD');
const _challengePath = String.fromEnvironment('SHOT_CHALLENGE_PATH');
const _hold = Duration(seconds: 6);

Future<void> _wait(WidgetTester tester, Duration d) async {
  await Future<void>.delayed(d);
  await tester.pump();
}

Future<void> _waitFor(WidgetTester tester, Finder f, {int seconds = 30}) async {
  for (var i = 0; i < seconds * 2; i++) {
    if (f.evaluate().isNotEmpty) return;
    await _wait(tester, const Duration(milliseconds: 500));
  }
  throw StateError('Timed out waiting for $f');
}

Future<void> _shot(WidgetTester tester, String name, {Duration settle = const Duration(seconds: 4)}) async {
  await _wait(tester, settle);
  // ignore: avoid_print
  print('SHOT_READY $name');
  await _wait(tester, _hold);
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('store screenshots', (tester) async {
    expect(_email, isNotEmpty, reason: 'pass --dart-define=SHOT_EMAIL');
    await app.main();
    await _wait(tester, const Duration(seconds: 3));

    final emailField = find.byKey(const Key('login-email'));
    if (emailField.evaluate().isNotEmpty) {
      await tester.enterText(find.descendant(of: emailField, matching: find.byType(TextField)), _email);
      await tester.enterText(
          find.descendant(of: find.byKey(const Key('login-password')), matching: find.byType(TextField)), _password);
      await tester.tap(find.widgetWithText(FilledButton, 'Login'));
    }
    await _waitFor(tester, find.byKey(const Key('tab-hub')));

    final container = ProviderScope.containerOf(tester.element(find.byKey(const Key('tab-hub'))));
    final router = container.read(routerProvider);

    await _shot(tester, '01-hub', settle: const Duration(seconds: 6));

    await tester.drag(find.byType(Scrollable).first, const Offset(0, -900));
    await _shot(tester, '02-hub-games');

    if (_challengePath.isNotEmpty) {
      router.go(_challengePath);
      await _shot(tester, '03-daily-challenge', settle: const Duration(seconds: 8));
    }

    router.go('/sudoku/play?difficulty=medium');
    await _shot(tester, '04-sudoku', settle: const Duration(seconds: 6));

    // The rest use no plays (the free plan allows 3 a day).
    router.go('/challenge/results');
    await _shot(tester, '05-challenge-results', settle: const Duration(seconds: 6));

    router.go('/leaderboard');
    await _shot(tester, '06-leaderboard', settle: const Duration(seconds: 6));

    router.go('/subscription');
    await _shot(tester, '07-plans', settle: const Duration(seconds: 8));

    // Keep the last screen up until the host has taken its screenshot.
    await _wait(tester, const Duration(seconds: 10));
    router.go('/');
    await _wait(tester, const Duration(seconds: 2));
    // ignore: avoid_print
    print('SHOTS_DONE');
  }, timeout: const Timeout(Duration(minutes: 10)));
}
