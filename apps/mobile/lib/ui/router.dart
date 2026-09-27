import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../config/constants.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/memory_game_screen.dart';
import 'screens/memory_setup_screen.dart';
import 'screens/register_screen.dart';

/// App router with auth-based redirects.
final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final status = auth.status;
      final loggingIn =
          state.matchedLocation == '/login' || state.matchedLocation == '/register';

      // While restoring the session, don't bounce the user around.
      if (status == AuthStatus.unknown) return null;

      final loggedIn = status == AuthStatus.authenticated;
      if (!loggedIn && !loggingIn) return '/login';
      // An authenticated user landing on /login is bounced home, but /register
      // is left reachable: a signed-in user may still need to finish confirming
      // a just-created account (the confirm step lives on the register screen).
      if (loggedIn && state.matchedLocation == '/login') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/memory-match/setup',
        builder: (_, __) => const MemorySetupScreen(),
      ),
      GoRoute(
        path: '/memory-match/play',
        builder: (_, state) {
          final themeId =
              state.uri.queryParameters['theme'] ?? kGameThemes.first.id;
          final difficultyId = state.uri.queryParameters['difficulty'] ?? 'EASY';
          final difficulty = Difficulty.values.firstWhere(
            (d) => d.id == difficultyId,
            orElse: () => Difficulty.easy,
          );
          return MemoryGameScreen(themeId: themeId, difficulty: difficulty);
        },
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('Route not found: ${state.uri}')),
    ),
  );
});
