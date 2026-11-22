import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_router.dart';

/// Every board game must lay out without overflow on a small iPhone.
const _screens = <String, Size>{
  'iPhone SE (3rd gen)': Size(375, 667),
  'iPhone SE (1st gen)': Size(320, 568),
};

const _routes = [
  '/sudoku/setup',
  '/sudoku/play?difficulty=hard',
  '/jigsaw-puzzle/setup',
  '/jigsaw-puzzle/play?difficulty=hard&image=city',
  '/sequence-memory/setup',
  '/sequence-memory/play?difficulty=hard&theme=f1-2026',
  '/pattern-recall/setup',
  '/pattern-recall/play?theme=colors&difficulty=hard',
  '/tic-tac-toe/setup',
  '/tic-tac-toe/play?difficulty=easy',
  '/tic-tac-toe/play?mode=two-player',
  '/bubble-pop/setup',
  '/bubble-pop/play?difficulty=hard',
  '/code-a-bot/setup',
  '/code-a-bot/play?difficulty=hard',
  '/math-maze/setup',
  '/math-maze/play?difficulty=hard',
];

void main() {
  for (final screen in _screens.entries) {
    for (final route in _routes) {
      testWidgets('${screen.key}: $route', (tester) async {
        tester.view.physicalSize = screen.value;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await pumpRouterApp(tester, location: route);
        await tester.pump(const Duration(milliseconds: 600));
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      });
    }
  }
}
