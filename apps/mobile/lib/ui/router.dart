import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../config/constants.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/memory_game_screen.dart';
import 'screens/memory_setup_screen.dart';
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
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
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
