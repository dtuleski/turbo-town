/// Dart models for the Quest Map GraphQL types.
/// Mirrors apps/web `src/types/quest.ts`. The server owns unlock rules, stars
/// and access; nothing here recomputes them.
library;

/// Launch context sent with `startGame` when a game is opened from a map node.
/// Web carries it as `?quest=<worldId>:<nodeId>:<legIndex>`.
class QuestContext {
  const QuestContext({
    required this.worldId,
    required this.nodeId,
    required this.legIndex,
  });

  final String worldId;
  final String nodeId;
  final int legIndex;

  static final RegExp _idPattern = RegExp(r'^[a-z0-9-]{1,40}$');
  static final RegExp _legPattern = RegExp(r'^[0-2]$');

  /// Parses `world:node:leg`. Returns null for anything else; never throws.
  /// Same rules as web `parseQuestParam`.
  static QuestContext? parse(String? raw) {
    if (raw == null) return null;
    final parts = raw.split(':');
    if (parts.length != 3) return null;
    if (!_idPattern.hasMatch(parts[0]) ||
        !_idPattern.hasMatch(parts[1]) ||
        !_legPattern.hasMatch(parts[2])) {
      return null;
    }
    return QuestContext(
      worldId: parts[0],
      nodeId: parts[1],
      legIndex: int.parse(parts[2]),
    );
  }

  String encode() => '$worldId:$nodeId:$legIndex';

  Map<String, dynamic> toJson() => {
        'worldId': worldId,
        'nodeId': nodeId,
        'legIndex': legIndex,
      };

  @override
  bool operator ==(Object other) =>
      other is QuestContext &&
      other.worldId == worldId &&
      other.nodeId == nodeId &&
      other.legIndex == legIndex;

  @override
  int get hashCode => Object.hash(worldId, nodeId, legIndex);

  @override
  String toString() => encode();
}

class LegParams {
  const LegParams({this.levelId, this.pageTheme});

  final String? levelId;
  final String? pageTheme;

  factory LegParams.fromJson(Map<String, dynamic> json) => LegParams(
        levelId: json['levelId'] as String?,
        pageTheme: json['pageTheme'] as String?,
      );
}

class LegView {
  const LegView({required this.themeId, required this.difficulty, this.params});

  final String themeId;
  final int difficulty;
  final LegParams? params;

  factory LegView.fromJson(Map<String, dynamic> json) => LegView(
        themeId: json['themeId'] as String? ?? '',
        difficulty: (json['difficulty'] as num?)?.toInt() ?? 1,
        params: json['params'] == null
            ? null
            : LegParams.fromJson(json['params'] as Map<String, dynamic>),
      );
}

class QuestNodeView {
  const QuestNodeView({
    required this.id,
    required this.kind,
    required this.status,
    required this.stars,
    required this.bestScore,
    required this.thresholds,
    required this.mapX,
    required this.mapY,
    required this.legs,
  });

  final String id;

  /// GAME | BOSS | BONUS
  final String kind;

  /// LOCKED | AVAILABLE | UNAVAILABLE
  final String status;
  final int stars;
  final int bestScore;
  final List<int> thresholds;

  /// Percent of the map box (0-100); y grows downward.
  final double mapX;
  final double mapY;
  final List<LegView> legs;

  factory QuestNodeView.fromJson(Map<String, dynamic> json) {
    final map = (json['map'] as Map<String, dynamic>?) ?? const {};
    return QuestNodeView(
      id: json['id'] as String? ?? '',
      kind: json['kind'] as String? ?? 'GAME',
      status: json['status'] as String? ?? 'LOCKED',
      stars: (json['stars'] as num?)?.toInt() ?? 0,
      bestScore: (json['bestScore'] as num?)?.toInt() ?? 0,
      thresholds: ((json['thresholds'] as List?) ?? const [])
          .map((e) => (e as num).toInt())
          .toList(),
      mapX: (map['x'] as num?)?.toDouble() ?? 50,
      mapY: (map['y'] as num?)?.toDouble() ?? 50,
      legs: ((json['legs'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(LegView.fromJson)
          .toList(),
    );
  }
}

class QuestActiveGauntlet {
  const QuestActiveGauntlet({
    required this.nodeId,
    required this.legsDone,
    required this.legsTotal,
    this.expiresAt,
  });

  final String nodeId;
  final int legsDone;
  final int legsTotal;
  final String? expiresAt;

  factory QuestActiveGauntlet.fromJson(Map<String, dynamic> json) =>
      QuestActiveGauntlet(
        nodeId: json['nodeId'] as String? ?? '',
        legsDone: (json['legsDone'] as num?)?.toInt() ?? 0,
        legsTotal: (json['legsTotal'] as num?)?.toInt() ?? 0,
        expiresAt: json['expiresAt'] as String?,
      );
}

class QuestWorldView {
  const QuestWorldView({
    required this.id,
    required this.order,
    required this.accessible,
    required this.totalStars,
    required this.maxStars,
    required this.badges,
    required this.nodes,
    this.activeGauntlet,
  });

  final String id;
  final int order;
  final bool accessible;
  final int totalStars;
  final int maxStars;
  final List<String> badges;
  final QuestActiveGauntlet? activeGauntlet;

  /// Path nodes in order, bonus node last.
  final List<QuestNodeView> nodes;

  factory QuestWorldView.fromJson(Map<String, dynamic> json) => QuestWorldView(
        id: json['id'] as String? ?? '',
        order: (json['order'] as num?)?.toInt() ?? 0,
        accessible: json['accessible'] as bool? ?? false,
        totalStars: (json['totalStars'] as num?)?.toInt() ?? 0,
        maxStars: (json['maxStars'] as num?)?.toInt() ?? 0,
        badges: ((json['badges'] as List?) ?? const []).cast<String>(),
        activeGauntlet: json['activeGauntlet'] == null
            ? null
            : QuestActiveGauntlet.fromJson(
                json['activeGauntlet'] as Map<String, dynamic>),
        nodes: ((json['nodes'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(QuestNodeView.fromJson)
            .toList(),
      );
}

class QuestRateLimitView {
  const QuestRateLimitView({
    required this.limit,
    required this.used,
    required this.remaining,
    this.resetAt,
  });

  final int limit;
  final int used;
  final int remaining;
  final String? resetAt;

  factory QuestRateLimitView.fromJson(Map<String, dynamic> json) =>
      QuestRateLimitView(
        limit: (json['limit'] as num?)?.toInt() ?? 0,
        used: (json['used'] as num?)?.toInt() ?? 0,
        remaining: (json['remaining'] as num?)?.toInt() ?? 0,
        resetAt: json['resetAt'] as String?,
      );
}

class QuestProgressView {
  const QuestProgressView({
    required this.tier,
    required this.rateLimit,
    required this.worlds,
  });

  final String tier;
  final QuestRateLimitView rateLimit;
  final List<QuestWorldView> worlds;

  factory QuestProgressView.fromJson(Map<String, dynamic> json) =>
      QuestProgressView(
        tier: json['tier'] as String? ?? 'FREE',
        rateLimit: QuestRateLimitView.fromJson(
            (json['rateLimit'] as Map<String, dynamic>?) ?? const {}),
        worlds: ((json['worlds'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(QuestWorldView.fromJson)
            .toList(),
      );
}

class QuestGauntletResult {
  const QuestGauntletResult({
    required this.legIndex,
    required this.legsTotal,
    required this.status,
    this.nextLeg,
  });

  final int legIndex;
  final int legsTotal;

  /// IN_PROGRESS | COMPLETE | EXPIRED
  final String status;
  final LegView? nextLeg;

  factory QuestGauntletResult.fromJson(Map<String, dynamic> json) =>
      QuestGauntletResult(
        legIndex: (json['legIndex'] as num?)?.toInt() ?? 0,
        legsTotal: (json['legsTotal'] as num?)?.toInt() ?? 1,
        status: json['status'] as String? ?? 'COMPLETE',
        nextLeg: json['nextLeg'] == null
            ? null
            : LegView.fromJson(json['nextLeg'] as Map<String, dynamic>),
      );
}

/// `completeGame.quest`: what the finished game did to the map.
class QuestResult {
  const QuestResult({
    required this.worldId,
    required this.nodeId,
    required this.kind,
    required this.score,
    required this.thresholds,
    required this.stars,
    required this.bestStars,
    required this.newlyUnlocked,
    required this.worldCleared,
    required this.badgesAwarded,
    this.gauntlet,
  });

  final String worldId;
  final String nodeId;
  final String kind;
  final int score;
  final List<int> thresholds;
  final int stars;
  final int bestStars;
  final List<String> newlyUnlocked;
  final bool worldCleared;
  final List<String> badgesAwarded;
  final QuestGauntletResult? gauntlet;

  factory QuestResult.fromJson(Map<String, dynamic> json) => QuestResult(
        worldId: json['worldId'] as String? ?? '',
        nodeId: json['nodeId'] as String? ?? '',
        kind: json['kind'] as String? ?? 'GAME',
        score: (json['score'] as num?)?.toInt() ?? 0,
        thresholds: ((json['thresholds'] as List?) ?? const [])
            .map((e) => (e as num).toInt())
            .toList(),
        stars: (json['stars'] as num?)?.toInt() ?? 0,
        bestStars: (json['bestStars'] as num?)?.toInt() ?? 0,
        newlyUnlocked:
            ((json['newlyUnlocked'] as List?) ?? const []).cast<String>(),
        worldCleared: json['worldCleared'] as bool? ?? false,
        badgesAwarded:
            ((json['badgesAwarded'] as List?) ?? const []).cast<String>(),
        gauntlet: json['gauntlet'] == null
            ? null
            : QuestGauntletResult.fromJson(
                json['gauntlet'] as Map<String, dynamic>),
      );
}
