import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/game_providers.dart';
import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations.dart';
import 'package:dashden_mobile/l10n/locale_controller.dart';
import 'package:dashden_mobile/ui/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fake_auth_controller.dart';
import 'fake_game_api.dart';

/// Pumps [child] inside the app theme, localization delegates and a
/// ProviderScope with a fake auth controller and a fake game API.
Future<void> pumpApp(
  WidgetTester tester,
  Widget child, {
  Locale locale = const Locale('en'),
  GameApi? gameApi,
  AuthState? authState,
  List<Override> overrides = const [],
}) async {
  SharedPreferences.setMockInitialValues({kLocalePrefKey: locale.languageCode});
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authControllerProvider
            .overrideWith((ref) => FakeAuthController(authState)),
        gameApiProvider.overrideWithValue(gameApi ?? FakeGameApi()),
        ...overrides,
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        locale: locale,
        supportedLocales: kSupportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: child,
      ),
    ),
  );
  await tester.pump();
}
