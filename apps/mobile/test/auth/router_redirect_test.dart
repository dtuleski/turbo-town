import 'package:dashden_mobile/api/game_providers.dart';
import 'package:dashden_mobile/auth/auth_controller.dart';
import 'package:dashden_mobile/l10n/gen/app_localizations.dart';
import 'package:dashden_mobile/ui/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fake_auth_controller.dart';
import '../helpers/fake_game_api.dart';

/// Mounts the real [routerProvider], navigates to [target] and returns where
/// the router ends up after the auth redirect ran.
Future<String> locationAfter(
  WidgetTester tester,
  AuthStatus status,
  String target,
) async {
  SharedPreferences.setMockInitialValues({});
  late GoRouter router;
  await tester.pumpWidget(ProviderScope(
    overrides: [
      authControllerProvider
          .overrideWith((ref) => FakeAuthController(AuthState(status: status))),
      gameApiProvider.overrideWithValue(FakeGameApi()),
    ],
    child: Consumer(builder: (context, ref, _) {
      router = ref.watch(routerProvider);
      return MaterialApp.router(
        supportedLocales: AppLocalizations.supportedLocales,
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
  await tester.pump(const Duration(milliseconds: 500));
  router.go(target);
  await tester.pump(const Duration(milliseconds: 500));
  return router.routerDelegate.currentConfiguration.uri.toString();
}

void main() {
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password?email=a%40b.co',
  ];

  for (final route in publicRoutes) {
    testWidgets('logged-out user can open $route', (tester) async {
      expect(await locationAfter(tester, AuthStatus.unauthenticated, route),
          route);
    });

    testWidgets('logged-in user is redirected away from $route',
        (tester) async {
      expect(
          await locationAfter(tester, AuthStatus.authenticated, route), '/');
    });
  }

  testWidgets('logged-out user is sent to /login from a private route',
      (tester) async {
    expect(await locationAfter(tester, AuthStatus.unauthenticated, '/'),
        '/login');
  });
}
