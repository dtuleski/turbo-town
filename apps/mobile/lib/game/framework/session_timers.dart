import 'dart:async';
import 'dart:math';

import 'game_session.dart';

/// Fisher-Yates shuffle of a copy of [items] using [rng].
List<T> shuffled<T>(Iterable<T> items, Random rng) {
  final a = List<T>.of(items);
  for (var i = a.length - 1; i > 0; i--) {
    final j = rng.nextInt(i + 1);
    final t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/// One-shot timers for a game board that respect the round: a callback that
/// comes due before play starts or while the round is paused waits until play
/// (resumes), and one that comes due after the round ended is dropped. All timers are cancelled by
/// [dispose], so a controller never leaves a pending timer behind.
class SessionTimers {
  SessionTimers(this._session);

  final GameSessionController _session;
  final Set<Timer> _timers = {};
  bool _disposed = false;

  void later(Duration delay, void Function() action) {
    if (_disposed) return;
    late Timer timer;
    void fire() {
      _timers.remove(timer);
      if (_disposed) return;
      final phase = _session.phase;
      // Waiting for the round to start (the start call is in flight) or for
      // a pause to end: try again shortly.
      if (phase == SessionPhase.paused ||
          phase == SessionPhase.idle ||
          phase == SessionPhase.starting) {
        timer = Timer(const Duration(milliseconds: 200), fire);
        _timers.add(timer);
        return;
      }
      if (phase != SessionPhase.playing) return;
      action();
    }

    timer = Timer(delay, fire);
    _timers.add(timer);
  }

  void cancelAll() {
    for (final t in _timers) {
      t.cancel();
    }
    _timers.clear();
  }

  void dispose() {
    _disposed = true;
    cancelAll();
  }
}
