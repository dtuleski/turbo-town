import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'auth/auth_controller.dart';
import 'config/env.dart';
import 'l10n/gen/app_localizations.dart';
import 'l10n/locale_controller.dart';
import 'push/push_controller.dart';
import 'subscription/subscription_controller.dart';
import 'ui/router.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize graphql_flutter's Hive-backed cache store.
  await initHiveForFlutter();
  runApp(const ProviderScope(child: DashDenApp()));
}

const List<LocalizationsDelegate<dynamic>> _delegates = [
  AppLocalizations.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
];

class DashDenApp extends ConsumerWidget {
  const DashDenApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeControllerProvider);
    // Signed in: notification settings, device registration, tap routing.
    ref.watch(pushSessionProvider);

    // Show a splash while the session is being restored from secure storage.
    if (auth.status == AuthStatus.unknown) {
      return MaterialApp(
        title: Env.appName,
        theme: AppTheme.light(),
        localizationsDelegates: _delegates,
        supportedLocales: kSupportedLocales,
        locale: locale,
        debugShowCheckedModeBanner: false,
        home: const _Splash(),
      );
    }

    // Listen for App Store transactions as soon as the user is signed in, so a
    // purchase that finished while the app was closed is confirmed right away.
    if (auth.status == AuthStatus.authenticated && ref.read(storeSubscriptionsEnabledProvider)) {
      ref.read(subscriptionControllerProvider);
    }

    return MaterialApp.router(
      title: Env.appName,
      theme: AppTheme.light(),
      localizationsDelegates: _delegates,
      supportedLocales: kSupportedLocales,
      locale: locale,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
