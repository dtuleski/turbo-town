import 'dart:ui';

import 'package:dashden_mobile/l10n/locale_controller.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('resolveLocale', () {
    test('saved choice wins over device', () {
      expect(
        resolveLocale(saved: 'es', device: const [Locale('pt')]),
        const Locale('es'),
      );
    });
    test('uses first supported device language and ignores region', () {
      expect(
        resolveLocale(device: const [Locale('fr'), Locale('pt', 'BR')]),
        const Locale('pt'),
      );
    });
    test('falls back to en', () {
      expect(resolveLocale(device: const [Locale('fr')]), const Locale('en'));
      expect(resolveLocale(saved: 'xx'), const Locale('en'));
    });
  });

  test('LocaleController persists the chosen locale', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final controller =
        LocaleController(prefs: prefs, deviceLocales: const [Locale('fr')]);
    await Future<void>.delayed(Duration.zero);
    expect(controller.state, const Locale('en'));
    await controller.setLocale(const Locale('pt'));
    expect(controller.state, const Locale('pt'));
    expect(prefs.getString(kLocalePrefKey), 'pt');

    final restored =
        LocaleController(prefs: prefs, deviceLocales: const [Locale('fr')]);
    await Future<void>.delayed(Duration.zero);
    expect(restored.state, const Locale('pt'));
  });
}
