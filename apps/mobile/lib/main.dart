import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import 'auth/auth_controller.dart';
import 'config/env.dart';
import 'ui/router.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize graphql_flutter's Hive-backed cache store.
  await initHiveForFlutter();
  runApp(const ProviderScope(child: DashDenApp()));
}

class DashDenApp extends ConsumerWidget {
  const DashDenApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final router = ref.watch(routerProvider);

    // Show a splash while the session is being restored from secure storage.
    if (auth.status == AuthStatus.unknown) {
      return MaterialApp(
        title: Env.appName,
        theme: AppTheme.light(),
        debugShowCheckedModeBanner: false,
        home: const _Splash(),
      );
    }

    return MaterialApp.router(
      title: Env.appName,
      theme: AppTheme.light(),
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
