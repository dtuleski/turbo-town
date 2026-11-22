import 'dart:math';

/// The generator `tools/export_physics_data.mjs` swaps in for `Math.random`
/// while it records the web outputs: replaying a seed here replays the web.
class LcgRandom implements Random {
  LcgRandom(int seed) : _x = seed & 0xFFFFFFFF;

  int _x;

  @override
  double nextDouble() {
    _x = (_x * 1664525 + 1013904223) & 0xFFFFFFFF;
    return _x / 4294967296;
  }

  @override
  int nextInt(int max) => (nextDouble() * max).floor();

  @override
  bool nextBool() => nextDouble() < 0.5;
}
