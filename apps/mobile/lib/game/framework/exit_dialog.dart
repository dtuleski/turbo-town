import 'package:flutter/material.dart';

import '../../l10n/gen/app_localizations.dart';

/// Asks before leaving a round in progress. Resolves true to leave.
Future<bool> confirmLeaveGame(BuildContext context) async {
  final l10n = AppLocalizations.of(context);
  final leave = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(l10n.mobileGame_leaveTitle),
      content: Text(l10n.mobileGame_leaveBody),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(l10n.mobileGame_keepPlaying),
        ),
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(l10n.mobileGame_leave),
        ),
      ],
    ),
  );
  return leave ?? false;
}
