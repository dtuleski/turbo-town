import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../api/quest_models.dart';
import '../config/constants.dart';
import '../quest/quest_launch.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/hub_screen.dart';
import 'screens/login_screen.dart';
import 'screens/memory_game_screen.dart';
import 'screens/memory_setup_screen.dart';
import 'screens/quest_map_screen.dart';
import 'screens/register_screen.dart';
import 'screens/reset_password_screen.dart';

/// Screens reachable while logged out. A logged-in user is sent home from them.
const _publicRoutes = {
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
};

/// App router with auth-based redirects.
final routerProvider = Provider<GoRouter>((ref) {
  // Watch only the status: any other auth change (busy flag, error text) must
  // not rebuild the router, which would reset navigation to the start route.
  final status = ref.watch(authControllerProvider.select((s) => s.status));

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final loggingIn = _publicRoutes.contains(state.matchedLocation);

      // While restoring the session, don't bounce the user around.
      if (status == AuthStatus.unknown) return null;

      final loggedIn = status == AuthStatus.authenticated;
      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (_, __) => const HubScreen(),
        routes: [
          // Nested so that go('/quest-map') keeps the hub underneath.
          GoRoute(
            path: 'quest-map',
            builder: (_, state) => QuestMapScreen(
              startFailed: state.uri.queryParameters['startFailed'],
            ),
          ),
        ],
      ),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (_, state) =>
            ResetPasswordScreen(initialEmail: state.uri.queryParameters['email']),
      ),
      GoRoute(
        path: '/memory-match/setup',
        builder: (_, __) => const MemorySetupScreen(),
      ),
      GoRoute(
        path: '/memory-match/play',
        builder: (_, state) {
          final query = state.uri.queryParameters;
          // `theme` and `difficulty` come from setup or a quest launch URL.
          // Invalid or missing values fall back to the first theme on easy.
          final settings = resolveMemorySettings(query) ??
              _memorySettingsFromSetup(query);
          return MemoryGameScreen(
            themeId: settings.themeId,
            difficulty: settings.difficulty,
            questContext: QuestContext.parse(query['quest']),
          );
        },
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('Route not found: ${state.uri}')),
    ),
  );
});

/// Setup passes `difficulty` as an enum id (`SUPER_HARD`), which a launch URL
/// never does, so it needs its own lookup.
({String themeId, Difficulty difficulty}) _memorySettingsFromSetup(
  Map<String, String> query,
) {
  final themeId = kGameThemes.any((t) => t.id == query['theme'])
      ? query['theme']!
      : kGameThemes.first.id;
  final difficulty = Difficulty.values.firstWhere(
    (d) => d.id == query['difficulty']?.toUpperCase(),
    orElse: () => Difficulty.easy,
  );
  return (themeId: themeId, difficulty: difficulty);
}
