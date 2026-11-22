import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/pump_router.dart';

/// The physics games must lay out without overflow on a small iPhone, in
/// every app language, and show their setup text.
const _screens = <String, Size>{
  'iPhone SE (3rd gen)': Size(375, 667),
  'iPhone SE (1st gen)': Size(320, 568),
};

const _routes = [
  '/space-entry/setup',
  '/space-entry/play?difficulty=easy',
  '/space-entry/play?difficulty=hard',
  '/bond-and-burn/setup',
  '/bond-and-burn/play?difficulty=easy',
  '/bond-and-burn/play?difficulty=hard',
  '/mini-golf/setup',
  '/mini-golf/play?difficulty=easy',
  '/mini-golf/play?difficulty=hard',
];

void main() {
  for (final locale in const ['en', 'es', 'pt']) {
    for (final screen in _screens.entries) {
      for (final route in _routes) {
        testWidgets('$locale ${screen.key}: $route', (tester) async {
          tester.view.physicalSize = screen.value;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.reset);
          await pumpRouterApp(tester, location: route, locale: Locale(locale));
          await tester.pump(const Duration(milliseconds: 600));
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
        });
      }
    }
  }
}
