import 'package:dashden_mobile/api/stats_models.dart';
import 'package:dashden_mobile/stats/stats_logic.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fake_stats_apis.dart';

AchievementDef def(String id) => kAchievements.firstWhere((a) => a.id == id);

void main() {
  final base = DateTime.utc(2025, 3, 1, 12);
  LeaderboardEntry e(int day, {int score = 100, String type = 'MEMORY_MATCH', double acc = 0.5, double time = 60, String diff = 'easy'}) =>
      entry(rank: day, score: score, gameType: type, accuracy: acc, time: time, difficulty: diff, at: base.add(Duration(days: day)));

  test('formatDuration and formatNumber', () {
    expect(formatDuration(45.4), '45s');
    expect(formatDuration(125), '2m 5s');
    expect(formatNumber(1234567), '1,234,567');
    expect(formatNumber(999), '999');
  });

  test('filterSortHistory filters, sorts and flips direction', () {
    final h = [e(1, score: 300), e(2, score: 100, type: 'SUDOKU'), e(3, score: 200, diff: 'Hard')];
    expect(filterSortHistory(h).map((x) => x.rank), [3, 2, 1]);
    expect(filterSortHistory(h, sort: HistorySort.score).map((x) => x.score), [300, 200, 100]);
    expect(filterSortHistory(h, sort: HistorySort.score, descending: false).map((x) => x.score), [100, 200, 300]);
    expect(filterSortHistory(h, gameFilter: 'SUDOKU').single.rank, 2);
    expect(filterSortHistory(h, difficultyFilter: 'hard').single.rank, 3);
  });

  test('paging', () {
    expect(pageCount(0), 1);
    expect(pageCount(10), 1);
    expect(pageCount(11), 2);
    final items = List.generate(23, (i) => i);
    expect(pageSlice(items, 3), [20, 21, 22]);
    expect(pageSlice(items, 4), isEmpty);
  });

  test('weeklyActivity buckets the last 8 weeks', () {
    final now = DateTime(2025, 3, 12, 10); // a Wednesday
    final entries = [
      entry(rank: 1, at: DateTime(2025, 3, 11, 9)),
      entry(rank: 2, at: DateTime(2025, 3, 9, 9)), // Sunday, same week
      entry(rank: 3, at: DateTime(2025, 3, 2, 9)), // previous week
      entry(rank: 4, at: DateTime(2024, 1, 2)), // outside range
    ];
    final weeks = weeklyActivity(entries, now);
    expect(weeks, hasLength(8));
    expect(weeks.last.count, 2);
    expect(weeks[6].count, 1);
    expect(weeks.fold<int>(0, (s, b) => s + b.count), 3);
  });

  test('scoreProgression normalizes per game and keeps the last 20', () {
    final h = [
      e(1, score: 50, type: 'A'),
      e(2, score: 100, type: 'A'),
      e(3, score: 10, type: 'B'),
    ];
    final p = scoreProgression(h);
    expect(p.normalized, [50, 100, 100]);
    expect(p.rollingAverage, [50, 75, 83]);
    expect(scoreProgression([for (var i = 1; i <= 30; i++) e(i)]).entries, hasLength(20));
  });

  test('dashboardTotals falls back between statistics and history', () {
    final h = [e(1, score: 300), e(2, score: 500)];
    final t = dashboardTotals(stats(games: 7, best: 400), h);
    expect((t.totalGames, t.bestScore, t.completedGames), (7, 500, 7));
    final none = dashboardTotals(null, h);
    expect((none.totalGames, none.bestScore), (2, 500));
    final empty = dashboardTotals(stats(games: 0, best: 0), const []);
    expect((empty.totalGames, empty.bestScore), (0, 0));
  });

  test('scoreTrend compares the 3 newest with the 3 before', () {
    LeaderboardEntry s(int v) => entry(score: v);
    expect(scoreTrend([s(1)]).direction, TrendDirection.stable);
    expect(scoreTrend([s(1), s(1), s(1)]).direction, TrendDirection.stable);
    final up = scoreTrend([s(200), s(200), s(200), s(100), s(100), s(100)]);
    expect(up.direction, TrendDirection.up);
    expect(up.percent, 100);
    expect(scoreTrend([s(50), s(50), s(50), s(100), s(100), s(100)]).direction, TrendDirection.down);
    expect(scoreTrend([s(101), s(101), s(101), s(100), s(100), s(100)]).direction, TrendDirection.stable);
  });

  group('achievements', () {
    test('first game and counts', () {
      expect(def('first-game').check(const []).unlocked, isFalse);
      final h = [for (var i = 1; i <= 10; i++) e(i)];
      final r = def('first-game').check(h);
      expect(r.unlocked, isTrue);
      expect(r.date, h.first.timestamp);
      expect(def('on-fire').check(h).unlocked, isTrue);
      expect(def('on-fire').check(h).date, h[9].timestamp);
      final committed = def('committed').check(h);
      expect((committed.progressKind, committed.current, committed.target), (ProgressKind.count, 10, 25));
    });

    test('accuracy, speed and score thresholds', () {
      final h = [e(1, acc: 0.95, time: 20, score: 5200)];
      expect(def('sharp-shooter').check(h).unlocked, isTrue);
      expect(def('speed-demon').check(h).unlocked, isTrue);
      expect(def('high-roller').check(h).unlocked, isTrue);
      expect(def('elite').check(h).unlocked, isFalse);
      expect(def('elite').check(h).current, 5200);
      expect(def('perfectionist').check(h).unlocked, isFalse);
      expect(def('perfectionist').check([e(1, acc: 1.0)]).unlocked, isTrue);
      final slow = def('speed-demon').check([e(1, time: 41.6)]);
      expect((slow.progressKind, slow.current), (ProgressKind.fastest, 42));
    });

    test('variety achievements use the date of the qualifying game', () {
      final h = [e(1, type: 'A'), e(2, type: 'A'), e(3, type: 'B'), e(4, type: 'C')];
      final r = def('explorer').check(h);
      expect(r.unlocked, isTrue);
      expect(r.date, h[3].timestamp);
      expect(def('explorer').check(h.take(3).toList()).current, 2);
      final big = [e(1, type: 'A', score: 6000), e(2, type: 'B', score: 6000), e(3, type: 'C', score: 7000)];
      expect(def('brain-power').check(big).unlocked, isTrue);
      expect(def('brain-power').check(big).date, big[2].timestamp);
      expect(def('hard-mode').check([e(1, diff: 'Hard')]).unlocked, isTrue);
    });

    test('per-game master and world traveler', () {
      expect(def('master-sudoku').check([e(1, type: 'SUDOKU', score: 5000)]).unlocked, isTrue);
      final partial = def('master-sudoku').check([e(1, type: 'SUDOKU', score: 900)]);
      expect((partial.unlocked, partial.progressKind, partial.current), (false, ProgressKind.best, 900));
      expect(def('master-sudoku').check(const []).progressKind, ProgressKind.none);
      final all = [for (var i = 0; i < kMasterGameTypes.length; i++) e(i + 1, type: kMasterGameTypes[i])];
      expect(def('world-traveler').check(all).unlocked, isTrue);
      expect(def('world-traveler').check(all.skip(1).toList()).unlocked, isFalse);
    });

    test('ids are unique', () {
      expect(kAchievements.map((a) => a.id).toSet(), hasLength(kAchievements.length));
    });
  });
}
