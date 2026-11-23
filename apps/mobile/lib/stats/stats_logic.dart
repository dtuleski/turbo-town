import '../api/stats_models.dart';

/// Pure helpers behind the statistics, history and achievements screens.
/// They port the calculations in apps/web `pages/dashboard/*`.

List<LeaderboardEntry> sortOldestFirst(List<LeaderboardEntry> h) =>
    [...h]..sort((a, b) => a.timestamp.compareTo(b.timestamp));

/// `45s` or `2m 5s`.
String formatDuration(double seconds) {
  if (seconds < 60) return '${seconds.round()}s';
  final m = seconds ~/ 60;
  final s = (seconds % 60).round();
  return '${m}m ${s}s';
}

/// 12345 -> `12,345` (locale independent, like toLocaleString in en).
String formatNumber(num n) {
  final s = n.round().abs().toString();
  final buf = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}

// ── History ────────────────────────────────────────────────────────────────

enum HistorySort { date, score, accuracy, time }

const int kHistoryPageSize = 10;

List<LeaderboardEntry> filterSortHistory(
  List<LeaderboardEntry> history, {
  String gameFilter = 'ALL',
  String difficultyFilter = 'ALL',
  HistorySort sort = HistorySort.date,
  bool descending = true,
}) {
  var result = [...history];
  if (gameFilter != 'ALL') {
    result = result.where((e) => e.gameType == gameFilter).toList();
  }
  if (difficultyFilter != 'ALL') {
    result = result
        .where((e) => e.difficulty.toLowerCase() == difficultyFilter)
        .toList();
  }
  int cmp(LeaderboardEntry a, LeaderboardEntry b) {
    switch (sort) {
      case HistorySort.date:
        return a.timestamp.compareTo(b.timestamp);
      case HistorySort.score:
        return a.score.compareTo(b.score);
      case HistorySort.accuracy:
        return a.accuracy.compareTo(b.accuracy);
      case HistorySort.time:
        return a.completionTime.compareTo(b.completionTime);
    }
  }

  result.sort((a, b) => descending ? cmp(b, a) : cmp(a, b));
  return result;
}

int pageCount(int total, [int pageSize = kHistoryPageSize]) =>
    total <= 0 ? 1 : (total + pageSize - 1) ~/ pageSize;

List<T> pageSlice<T>(List<T> items, int page, [int pageSize = kHistoryPageSize]) {
  final start = (page - 1) * pageSize;
  if (start >= items.length) return const [];
  final end = start + pageSize;
  return items.sublist(start, end > items.length ? items.length : end);
}

/// Best score per game type.
Map<String, int> personalBestScores(List<LeaderboardEntry> history) {
  final bests = <String, int>{};
  for (final e in history) {
    if (e.score > (bests[e.gameType] ?? 0)) bests[e.gameType] = e.score;
  }
  return bests;
}

// ── Statistics ─────────────────────────────────────────────────────────────

class WeekBucket {
  WeekBucket(this.start, this.count);
  final DateTime start;
  int count;
}

DateTime _weekStart(DateTime d) {
  // Calendar arithmetic through the constructor keeps midnight across DST.
  return DateTime(d.year, d.month, d.day - d.weekday % 7); // Sunday start
}

/// Games per week for the last 8 weeks, oldest first.
List<WeekBucket> weeklyActivity(List<LeaderboardEntry> entries, DateTime now) {
  final buckets = <WeekBucket>[
    for (var i = 7; i >= 0; i--)
      WeekBucket(_weekStart(DateTime(now.year, now.month, now.day - i * 7)), 0),
  ];
  for (final e in entries) {
    final key = _weekStart(e.timestamp.toLocal());
    for (final b in buckets) {
      if (b.start == key) {
        b.count++;
        break;
      }
    }
  }
  return buckets;
}

class ScoreProgression {
  const ScoreProgression({
    required this.entries,
    required this.normalized,
    required this.rollingAverage,
  });
  final List<LeaderboardEntry> entries;

  /// Each score as a percent of the best for its game type (0-100).
  final List<int> normalized;

  /// Rolling window of 5 over [normalized].
  final List<int> rollingAverage;
}

/// Last 20 games oldest first, normalized per game type like web.
ScoreProgression scoreProgression(List<LeaderboardEntry> filtered) {
  final chrono = sortOldestFirst(filtered);
  final last = chrono.length > 20 ? chrono.sublist(chrono.length - 20) : chrono;
  final maxByType = personalBestScores(chrono);
  final normalized = [
    for (final e in last)
      ((e.score / ((maxByType[e.gameType] ?? 0) == 0 ? 1 : maxByType[e.gameType]!)) *
              100)
          .round(),
  ];
  final rolling = <int>[];
  for (var i = 0; i < normalized.length; i++) {
    final from = i - 4 < 0 ? 0 : i - 4;
    final w = normalized.sublist(from, i + 1);
    rolling.add((w.reduce((a, b) => a + b) / w.length).round());
  }
  return ScoreProgression(
    entries: last,
    normalized: normalized,
    rollingAverage: rolling,
  );
}

/// Game types by number of plays, most played first.
List<MapEntry<String, int>> gameBreakdown(List<LeaderboardEntry> history) {
  final counts = <String, int>{};
  for (final e in history) {
    counts[e.gameType] = (counts[e.gameType] ?? 0) + 1;
  }
  return counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
}

/// Best entry per game type, highest score first.
List<LeaderboardEntry> personalBestEntries(List<LeaderboardEntry> history) {
  final best = <String, LeaderboardEntry>{};
  for (final e in history) {
    final cur = best[e.gameType];
    if (cur == null || e.score > cur.score) best[e.gameType] = e;
  }
  return best.values.toList()..sort((a, b) => b.score.compareTo(a.score));
}

// ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardTotals {
  const DashboardTotals(this.totalGames, this.bestScore, this.completedGames);
  final int totalGames;
  final int bestScore;
  final int completedGames;
}

/// Same fallbacks as web: score-history values win for the best score, server
/// statistics win for the counts, and either half fills in when the other
/// is missing.
DashboardTotals dashboardTotals(
  UserStatistics? stats,
  List<LeaderboardEntry> history,
) {
  final leaderboardBest = history.isEmpty
      ? 0
      : history.map((h) => h.score).reduce((a, b) => a > b ? a : b);
  int orHistory(int? v) => (v == null || v == 0) ? history.length : v;
  return DashboardTotals(
    orHistory(stats?.totalGames),
    leaderboardBest != 0 ? leaderboardBest : (stats?.bestScore ?? 0),
    orHistory(stats?.totalCompletedGames),
  );
}

enum TrendDirection { up, down, stable }

/// Recent 3 scores against the 3 before them (history is newest first).
({TrendDirection direction, double percent}) scoreTrend(
  List<LeaderboardEntry> newestFirst,
) {
  if (newestFirst.length < 2) return (direction: TrendDirection.stable, percent: 0);
  final recent = newestFirst.take(3).toList();
  final older = newestFirst.skip(3).take(3).toList();
  if (older.isEmpty) return (direction: TrendDirection.stable, percent: 0);
  double avg(List<LeaderboardEntry> l) =>
      l.fold<int>(0, (s, e) => s + e.score) / l.length;
  final olderAvg = avg(older);
  if (olderAvg == 0) return (direction: TrendDirection.stable, percent: 0);
  final change = (avg(recent) - olderAvg) / olderAvg * 100;
  if (change.abs() < 5) return (direction: TrendDirection.stable, percent: 0);
  return (
    direction: change > 0 ? TrendDirection.up : TrendDirection.down,
    percent: change.abs(),
  );
}

// ── Achievements ───────────────────────────────────────────────────────────

enum AchievementCategory { gettingStarted, dedication, mastery, gameSpecific }

/// What to show for a locked achievement.
enum ProgressKind { none, count, best, bestPercent, fastest, games }

class AchievementResult {
  const AchievementResult.unlocked(this.date)
      : unlocked = true,
        progressKind = ProgressKind.none,
        current = 0,
        target = 0;
  const AchievementResult.locked([
    this.progressKind = ProgressKind.none,
    this.current = 0,
    this.target = 0,
  ])  : unlocked = false,
        date = null;

  final bool unlocked;
  final DateTime? date;
  final ProgressKind progressKind;

  /// Count, score, seconds or game count, depending on [progressKind].
  final num current;
  final num target;
}

class AchievementDef {
  const AchievementDef(this.id, this.icon, this.category, this.check, {this.gameType});
  final String id;
  final String icon;
  final AchievementCategory category;
  final AchievementResult Function(List<LeaderboardEntry> history) check;

  /// Set for the per-game "Master" achievements.
  final String? gameType;
}

/// Game types with a Master achievement (the web list).
const List<String> kMasterGameTypes = [
  'MEMORY_MATCH', 'MATH_CHALLENGE', 'WORD_PUZZLE', 'LANGUAGE_LEARNING',
  'SUDOKU', 'JIGSAW_PUZZLE', 'BUBBLE_POP', 'SEQUENCE_MEMORY', 'CODE_A_BOT',
  'GEO_QUIZ', 'HISTORY_QUIZ', 'CIVICS_QUIZ', 'COLOR_BY_NUMBER', 'HANGMAN',
  'TIC_TAC_TOE', 'CIRCUIT_BUILDER',
];

LeaderboardEntry? _firstWhere(
  List<LeaderboardEntry> h,
  bool Function(LeaderboardEntry) test,
) {
  for (final e in sortOldestFirst(h)) {
    if (test(e)) return e;
  }
  return null;
}

AchievementResult _firstMatch(
  List<LeaderboardEntry> h,
  bool Function(LeaderboardEntry) test, [
  AchievementResult Function()? locked,
]) {
  final m = _firstWhere(h, test);
  if (m != null) return AchievementResult.unlocked(m.timestamp);
  return locked?.call() ?? const AchievementResult.locked();
}

AchievementResult _countAtLeast(List<LeaderboardEntry> h, int n) {
  if (h.length < n) return AchievementResult.locked(ProgressKind.count, h.length, n);
  return AchievementResult.unlocked(sortOldestFirst(h)[n - 1].timestamp);
}

int _maxScore(Iterable<LeaderboardEntry> h) =>
    h.fold<int>(0, (m, e) => e.score > m ? e.score : m);

AchievementResult _scoreAtLeast(List<LeaderboardEntry> h, int n) => _firstMatch(
      h,
      (e) => e.score >= n,
      () => AchievementResult.locked(ProgressKind.best, _maxScore(h)),
    );

/// First time [n] distinct values had been seen, in play order.
DateTime? _whenDistinct(
  List<LeaderboardEntry> sortedOldest,
  int n,
  String Function(LeaderboardEntry) key,
) {
  final seen = <String>{};
  for (final e in sortedOldest) {
    seen.add(key(e));
    if (seen.length >= n) return e.timestamp;
  }
  return null;
}

final List<AchievementDef> kAchievements = [
  AchievementDef('first-game', '🎮', AchievementCategory.gettingStarted, (h) {
    if (h.isEmpty) return const AchievementResult.locked(ProgressKind.count, 0, 1);
    return AchievementResult.unlocked(sortOldestFirst(h).first.timestamp);
  }),
  AchievementDef('sharp-shooter', '🎯', AchievementCategory.gettingStarted, (h) {
    return _firstMatch(h, (e) => e.accuracy >= 0.9, () {
      final best = h.fold<double>(0, (m, e) => e.accuracy > m ? e.accuracy : m);
      return AchievementResult.locked(ProgressKind.bestPercent, (best * 100).round());
    });
  }),
  AchievementDef('speed-demon', '⚡', AchievementCategory.gettingStarted, (h) {
    return _firstMatch(h, (e) => e.completionTime < 30, () {
      if (h.isEmpty) return const AchievementResult.locked();
      final fastest = h.map((e) => e.completionTime).reduce((a, b) => a < b ? a : b);
      return AchievementResult.locked(ProgressKind.fastest, fastest.round());
    });
  }),
  AchievementDef('explorer', '🌈', AchievementCategory.gettingStarted, (h) {
    final types = h.map((e) => e.gameType).toSet();
    if (types.length < 3) {
      return AchievementResult.locked(ProgressKind.count, types.length, 3);
    }
    return AchievementResult.unlocked(
      _whenDistinct(sortOldestFirst(h), 3, (e) => e.gameType),
    );
  }),
  AchievementDef('high-roller', '🏆', AchievementCategory.gettingStarted,
      (h) => _scoreAtLeast(h, 5000)),
  AchievementDef('on-fire', '🔥', AchievementCategory.dedication,
      (h) => _countAtLeast(h, 10)),
  AchievementDef('committed', '💪', AchievementCategory.dedication,
      (h) => _countAtLeast(h, 25)),
  AchievementDef('veteran', '🎓', AchievementCategory.dedication,
      (h) => _countAtLeast(h, 50)),
  AchievementDef('legend', '👑', AchievementCategory.dedication,
      (h) => _countAtLeast(h, 100)),
  AchievementDef('brain-power', '🧠', AchievementCategory.mastery, (h) {
    final over = h.where((e) => e.score >= 5000).toList();
    final types = over.map((e) => e.gameType).toSet();
    if (types.length < 3) {
      return AchievementResult.locked(ProgressKind.games, types.length, 3);
    }
    return AchievementResult.unlocked(
      _whenDistinct(sortOldestFirst(over), 3, (e) => e.gameType),
    );
  }),
  AchievementDef('perfectionist', '💯', AchievementCategory.mastery,
      (h) => _firstMatch(h, (e) => e.accuracy >= 1.0)),
  AchievementDef('world-traveler', '🌍', AchievementCategory.mastery, (h) {
    final total = kMasterGameTypes.length;
    final types = h.map((e) => e.gameType).toSet();
    if (types.length < total) {
      return AchievementResult.locked(ProgressKind.count, types.length, total);
    }
    return AchievementResult.unlocked(
      _whenDistinct(sortOldestFirst(h), total, (e) => e.gameType),
    );
  }),
  AchievementDef('elite', '⭐', AchievementCategory.mastery,
      (h) => _scoreAtLeast(h, 7000)),
  AchievementDef('hard-mode', '🔒', AchievementCategory.mastery,
      (h) => _firstMatch(h, (e) => e.difficulty.toLowerCase() == 'hard')),
  for (final type in kMasterGameTypes)
    AchievementDef(
      'master-${type.toLowerCase()}',
      '',
      AchievementCategory.gameSpecific,
      (h) {
        final m = _firstWhere(h, (e) => e.gameType == type && e.score >= 5000);
        if (m != null) return AchievementResult.unlocked(m.timestamp);
        final best = _maxScore(h.where((e) => e.gameType == type));
        return best > 0
            ? AchievementResult.locked(ProgressKind.best, best)
            : const AchievementResult.locked();
      },
      gameType: type,
    ),
];
