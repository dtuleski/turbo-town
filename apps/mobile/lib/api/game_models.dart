/// Dart models mirroring the game service GraphQL types.
library;

class RateLimitInfo {
  const RateLimitInfo({
    required this.tier,
    required this.limit,
    required this.used,
    required this.remaining,
    this.resetAt,
  });

  final String tier;
  final int limit;
  final int used;
  final int remaining;
  final String? resetAt;

  factory RateLimitInfo.fromJson(Map<String, dynamic> json) {
    return RateLimitInfo(
      tier: json['tier'] as String? ?? 'FREE',
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
      resetAt: json['resetAt'] as String?,
    );
  }
}

/// Response from the `startGame` mutation.
class StartGameResult {
  const StartGameResult({
    required this.id,
    required this.themeId,
    required this.difficulty,
    required this.status,
    required this.canPlay,
    this.rateLimit,
  });

  final String id;
  final String themeId;
  final int difficulty;
  final String status;
  final bool canPlay;
  final RateLimitInfo? rateLimit;

  factory StartGameResult.fromJson(Map<String, dynamic> json) {
    return StartGameResult(
      id: json['id'] as String,
      themeId: json['themeId'] as String? ?? '',
      difficulty: (json['difficulty'] as num?)?.toInt() ?? 1,
      status: json['status'] as String? ?? 'IN_PROGRESS',
      canPlay: json['canPlay'] as bool? ?? true,
      rateLimit: json['rateLimit'] == null
          ? null
          : RateLimitInfo.fromJson(json['rateLimit'] as Map<String, dynamic>),
    );
  }
}

class ScoreBreakdown {
  const ScoreBreakdown({
    required this.baseScore,
    required this.difficultyMultiplier,
    required this.speedBonus,
    required this.accuracyBonus,
    required this.finalScore,
  });

  final int baseScore;
  final double difficultyMultiplier;
  final int speedBonus;
  final int accuracyBonus;
  final int finalScore;

  factory ScoreBreakdown.fromJson(Map<String, dynamic> json) {
    return ScoreBreakdown(
      baseScore: (json['baseScore'] as num?)?.toInt() ?? 0,
      difficultyMultiplier:
          (json['difficultyMultiplier'] as num?)?.toDouble() ?? 1.0,
      speedBonus: (json['speedBonus'] as num?)?.toInt() ?? 0,
      accuracyBonus: (json['accuracyBonus'] as num?)?.toInt() ?? 0,
      finalScore: (json['finalScore'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Response from the `completeGame` mutation.
class CompleteGameResult {
  const CompleteGameResult({
    required this.id,
    required this.status,
    required this.score,
    this.completionTime,
    this.attempts,
    this.scoreBreakdown,
    this.leaderboardRank,
  });

  final String id;
  final String status;
  final int score;
  final int? completionTime;
  final int? attempts;
  final ScoreBreakdown? scoreBreakdown;
  final int? leaderboardRank;

  factory CompleteGameResult.fromJson(Map<String, dynamic> json) {
    return CompleteGameResult(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'COMPLETED',
      score: (json['score'] as num?)?.toInt() ?? 0,
      completionTime: (json['completionTime'] as num?)?.toInt(),
      attempts: (json['attempts'] as num?)?.toInt(),
      scoreBreakdown: json['scoreBreakdown'] == null
          ? null
          : ScoreBreakdown.fromJson(
              json['scoreBreakdown'] as Map<String, dynamic>),
      leaderboardRank: (json['leaderboardRank'] as num?)?.toInt(),
    );
  }
}

/// Response from the `canStartGame` query.
class CanStartGameResult {
  const CanStartGameResult({
    required this.canPlay,
    this.rateLimit,
    this.message,
  });

  final bool canPlay;
  final RateLimitInfo? rateLimit;
  final String? message;

  factory CanStartGameResult.fromJson(Map<String, dynamic> json) {
    return CanStartGameResult(
      canPlay: json['canPlay'] as bool? ?? false,
      rateLimit: json['rateLimit'] == null
          ? null
          : RateLimitInfo.fromJson(json['rateLimit'] as Map<String, dynamic>),
      message: json['message'] as String?,
    );
  }
}

/// Thrown when the backend rejects a game action.
class GameApiException implements Exception {
  GameApiException(this.message, {this.code});
  final String message;
  final String? code;

  bool get isRateLimited => code == 'RATE_LIMIT_EXCEEDED';
  bool get isPaywall =>
      code == 'AUTHZ_TIER_REQUIRED' ||
      code == 'PAID_FEATURE_REQUIRED' ||
      message.toLowerCase().contains('paid subscription');

  @override
  String toString() => message;
}
