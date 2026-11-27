import 'package:dashden_mobile/api/challenge_api.dart';
import 'package:dashden_mobile/api/game_api.dart';
import 'package:dashden_mobile/api/game_providers.dart';
import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/game/framework/game_feedback.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations.dart';
import 'package:dashden_mobile/l10n/locale_controller.dart';
import 'package:dashden_mobile/ui/router.dart';
import 'package:dashden_mobile/ui/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'challenge_fixtures.dart';
import 'fake_auth_controller.dart';
import 'fake_game_api.dart';

/// Tall portrait surface so lists and grids build every child.
void useTallSurface(WidgetTester tester) {
  tester.view.physicalSize = const Size(1000, 8000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

class RouterHarness {
  RouterHarness(this.router, this.container, this.api);

  final GoRouter router;
  final ProviderContainer container;
  final FakeGameApi api;
}

/// Mounts the real app router with a signed-in fake user and [api], then
/// navigates to [location]. [challengeApi] answers the Daily Challenge reads
/// (no challenge by default), so the hub card never calls the network.
Future<RouterHarness> pumpRouterApp(
  WidgetTester tester, {
  required String location,
  FakeGameApi? api,
  Locale locale = const Locale('en'),
  List<Override> overrides = const [],
  ChallengeApi? challengeApi,
}) async {
  SharedPreferences.setMockInitialValues({kLocalePrefKey: locale.languageCode});
  final fake = api ?? FakeGameApi();
  late GoRouter router;
  await tester.pumpWidget(ProviderScope(
    overrides: [
      authControllerProvider.overrideWith((ref) => FakeAuthController()),
      gameApiProvider.overrideWithValue(fake as GameApi),
      gameFeedbackProvider.overrideWithValue(const NoopGameFeedback()),
      challengeApiProvider.overrideWithValue(challengeApi ?? FakeChallengeApi()),
      ...overrides,
    ],
    child: Consumer(builder: (context, ref, _) {
      router = ref.watch(routerProvider);
      return MaterialApp.router(
        theme: AppTheme.light(),
        locale: locale,
        supportedLocales: kSupportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: router,
      );
    }),
  ));
  await tester.pump(const Duration(milliseconds: 300));
  router.go(location);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 500));
  final container = ProviderScope.containerOf(
    tester.element(find.byType(MaterialApp)),
  );
  return RouterHarness(router, container, fake);
}
