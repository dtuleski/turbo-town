import 'package:flutter/material.dart';

import '../../l10n/gen/app_localizations.dart';
import 'game_session.dart';

/// Shown instead of a game that could not start.
///
/// There is no purchase or pricing UI in the app (payments are deferred), so a
/// paid-tier block reads as a neutral "not available in the app yet".
class BlockedView extends StatelessWidget {
  const BlockedView({super.key, required this.reason, required this.onBack});

  final BlockReason reason;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final limited = reason == BlockReason.rateLimited;
    final title =
        limited ? l10n.mobileGame_limitTitle : l10n.mobileGame_unavailableTitle;
    final body =
        limited ? l10n.mobileGame_limitBody : l10n.mobileGame_unavailableBody;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(limited ? '⏳' : '🚧', style: const TextStyle(fontSize: 56)),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onBack,
              child: Text(l10n.mobileGame_goBack),
            ),
          ],
        ),
      ),
    );
  }
}
