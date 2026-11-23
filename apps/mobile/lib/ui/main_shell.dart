import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/gen/app_localizations.dart';

/// Tab routes in bar order.
const List<String> kShellTabs = [
  '/',
  '/quest-map',
  '/dashboard',
  '/leaderboard',
  '/profile',
];

/// Bottom navigation around the five main tabs (go_router ShellRoute).
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final path = GoRouterState.of(context).uri.path;
    final index = kShellTabs.indexOf(path);
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        key: const Key('main-nav'),
        selectedIndex: index < 0 ? 0 : index,
        onDestinationSelected: (i) => context.go(kShellTabs[i]),
        destinations: [
          NavigationDestination(
            key: const Key('tab-hub'),
            icon: const Icon(Icons.sports_esports_outlined),
            selectedIcon: const Icon(Icons.sports_esports),
            label: l10n.mobileStats_tabHub,
          ),
          NavigationDestination(
            key: const Key('tab-quest'),
            icon: const Icon(Icons.map_outlined),
            selectedIcon: const Icon(Icons.map),
            label: l10n.mobileStats_tabQuest,
          ),
          NavigationDestination(
            key: const Key('tab-dashboard'),
            icon: const Icon(Icons.dashboard_outlined),
            selectedIcon: const Icon(Icons.dashboard),
            label: l10n.mobileStats_tabDashboard,
          ),
          NavigationDestination(
            key: const Key('tab-leaderboard'),
            icon: const Icon(Icons.emoji_events_outlined),
            selectedIcon: const Icon(Icons.emoji_events),
            label: l10n.mobileStats_tabLeaderboard,
          ),
          NavigationDestination(
            key: const Key('tab-profile'),
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: l10n.mobileStats_tabProfile,
          ),
        ],
      ),
    );
  }
}
