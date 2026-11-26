import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../api/challenge_models.dart';
import '../../api/game_providers.dart';
import '../../challenge/challenge_launch.dart';
import '../../l10n/gen/app_localizations.dart';

/// Given-content mode (M3, web `useChallengeContent`): loads today's challenge
/// and builds the game with its content once it is the challenge of [day] for
/// the game with content type [C]. Anything else (feature off, load error,
/// another game or day) sends the player to the hub before any start, so no
/// play is used.
class ChallengeGate<C extends ChallengeContent> extends ConsumerWidget {
  const ChallengeGate({super.key, required this.day, required this.title, required this.builder});

  final String day;

  /// App bar title while the challenge loads.
  final String title;

  /// Builds the game with the content and the challenge's difficulty name.
  final Widget Function(BuildContext context, GivenChallenge<C> challenge, String difficulty) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loaded = ref.watch(dailyChallengeProvider);
    final challenge = loaded.valueOrNull;
    final content = selectChallengeContent<C>(challenge, day);
    if (challenge != null && content != null) {
      return builder(context, (day: day, content: content), challengeDifficultyName(challenge.difficulty));
    }
    if (!loaded.isLoading) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go(kChallengeFailedPath);
      });
    }
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text(AppLocalizations.of(context).mobileGame_starting),
          ],
        ),
      ),
    );
  }
}
