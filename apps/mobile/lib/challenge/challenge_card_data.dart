import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/challenge_models.dart';
import '../api/game_providers.dart';

/// How many leaderboard rows the hub card shows (web `CARD_TOP_COUNT`).
const int kChallengeCardTopCount = 5;

/// Today's challenge and its top 5 for the hub card.
class ChallengeCardData {
  const ChallengeCardData({required this.challenge, this.leaderboard});

  final DailyChallengeView challenge;

  /// Null when it failed to load or answered for another day; the card still
  /// shows the challenge.
  final ChallengeLeaderboardView? leaderboard;
}

/// Hub card data (web `loadDailyChallengeCard`); null when the challenge is
/// off or fails to load. Separate from [dailyChallengeProvider], which a
/// running challenge game reads, so refreshing the card never touches a game.
final challengeCardProvider = FutureProvider.autoDispose<ChallengeCardData?>((ref) async {
  final api = ref.watch(challengeApiProvider);
  final results = await Future.wait([
    api.getDailyChallenge(),
    api.getChallengeLeaderboard(limit: kChallengeCardTopCount),
  ]);
  final challenge = results[0] as DailyChallengeView?;
  final leaderboard = results[1] as ChallengeLeaderboardView?;
  if (challenge == null) return null;
  return ChallengeCardData(
    challenge: challenge,
    leaderboard: leaderboard != null && leaderboard.day == challenge.day ? leaderboard : null,
  );
});
