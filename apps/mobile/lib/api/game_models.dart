/// Dart models mirroring the game service GraphQL types.
library;

import 'quest_models.dart';

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
    this.accuracy,
  });

  final int baseScore;
  final double difficultyMultiplier;
  final int speedBonus;
  final int accuracyBonus;
  final int finalScore;

  /// 0..1 accuracy used by the server, when it reports one.
  final double? accuracy;

  factory ScoreBreakdown.fromJson(Map<String, dynamic> json) {
    return ScoreBreakdown(
      baseScore: (json['baseScore'] as num?)?.toInt() ?? 0,
      difficultyMultiplier:
          (json['difficultyMultiplier'] as num?)?.toDouble() ?? 1.0,
      speedBonus: (json['speedBonus'] as num?)?.toInt() ?? 0,
      accuracyBonus: (json['accuracyBonus'] as num?)?.toInt() ?? 0,
      finalScore: (json['finalScore'] as num?)?.toInt() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble(),
    );
  }
}

class AchievementResult {
  const AchievementResult({
    required this.type,
    required this.unlocked,
    this.progress = 0,
    this.completedAt,
  });

  final String type;
  final bool unlocked;
  final num progress;
  final String? completedAt;

  factory AchievementResult.fromJson(Map<String, dynamic> json) {
    return AchievementResult(
      type: json['type'] as String? ?? '',
      unlocked: json['unlocked'] as bool? ?? false,
      progress: (json['progress'] as num?) ?? 0,
      completedAt: json['completedAt'] as String?,
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
    this.achievements = const [],
    this.quest,
  });

  final String id;
  final String status;
  final int score;
  final int? completionTime;
  final int? attempts;
  final ScoreBreakdown? scoreBreakdown;
  final int? leaderboardRank;
  final List<AchievementResult> achievements;

  /// Quest Map result; null for games not started from the map.
  final QuestResult? quest;

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
      achievements: ((json['achievements'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(AchievementResult.fromJson)
          .toList(),
      quest: json['quest'] == null
          ? null
          : QuestResult.fromJson(json['quest'] as Map<String, dynamic>),
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

/// One row of the `listAvailableGames` catalog.
class GameCatalogItem {
  const GameCatalogItem({
    required this.gameId,
    required this.title,
    required this.description,
    required this.icon,
    required this.route,
    required this.status,
    required this.displayOrder,
    required this.ageRange,
    required this.category,
  });

  final String gameId;
  final String title;
  final String description;
  final String icon;
  final String route;

  /// ACTIVE | COMING_SOON | MAINTENANCE
  final String status;
  final int displayOrder;
  final String ageRange;
  final String category;

  bool get isActive => status == 'ACTIVE';

  factory GameCatalogItem.fromJson(Map<String, dynamic> json) {
    return GameCatalogItem(
      gameId: json['gameId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? '',
      route: json['route'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
      ageRange: json['ageRange'] as String? ?? '',
      category: json['category'] as String? ?? '',
    );
  }
}

class ReviewStats {
  const ReviewStats({
    required this.gameType,
    required this.averageRating,
    required this.totalReviews,
  });

  final String gameType;
  final double averageRating;
  final int totalReviews;

  factory ReviewStats.fromJson(Map<String, dynamic> json) {
    return ReviewStats(
      gameType: json['gameType'] as String? ?? '',
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
      totalReviews: (json['totalReviews'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Response of `getReviewStats`: per-game ratings keyed by `gameType`
/// (the game id upper-cased with dashes as underscores, e.g. MEMORY_MATCH).
class ReviewStatsResult {
  const ReviewStatsResult({required this.perGame, this.overall});

  final List<ReviewStats> perGame;
  final ReviewStats? overall;

  factory ReviewStatsResult.fromJson(Map<String, dynamic> json) {
    return ReviewStatsResult(
      perGame: ((json['perGame'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ReviewStats.fromJson)
          .toList(),
      overall: json['overall'] == null
          ? null
          : ReviewStats.fromJson(json['overall'] as Map<String, dynamic>),
    );
  }
}
