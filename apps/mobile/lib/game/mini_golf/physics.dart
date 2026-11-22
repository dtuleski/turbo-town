import 'dart:math' as math;

import 'data.dart';

/// Pure Mini Golf physics, ported from apps/web `utils/miniGolfPhysics.ts`.
/// One call to [physicsTick] is one fixed 1/60 s step; the caller owns time
/// and randomness, so the same inputs always give the same ball.

class Vec2 {
  const Vec2(this.x, this.y);
  final double x;
  final double y;
  static const Vec2 zero = Vec2(0, 0);

  Vec2 operator +(Vec2 o) => Vec2(x + o.x, y + o.y);
  Vec2 operator -(Vec2 o) => Vec2(x - o.x, y - o.y);
  Vec2 scaled(double s) => Vec2(x * s, y * s);
  double dot(Vec2 o) => x * o.x + y * o.y;
  double get length => math.sqrt(x * x + y * y);

  Vec2 normalized() {
    final l = length;
    if (l == 0) return Vec2.zero;
    return Vec2(x / l, y / l);
  }

  Vec2 reflect(Vec2 normal) {
    final d = 2 * dot(normal);
    return Vec2(x - d * normal.x, y - d * normal.y);
  }

  double distanceTo(Vec2 o) => (o - this).length;

  @override
  bool operator ==(Object other) => other is Vec2 && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);

  @override
  String toString() => 'Vec2($x, $y)';
}

class BallState {
  const BallState({
    required this.pos,
    this.vel = Vec2.zero,
    this.inSand = false,
    this.inWater = false,
    this.sunk = false,
  });
  final Vec2 pos;
  final Vec2 vel;
  final bool inSand;
  final bool inWater;
  final bool sunk;

  BallState copyWith({Vec2? pos, Vec2? vel}) =>
      BallState(pos: pos ?? this.pos, vel: vel ?? this.vel, inSand: inSand, inWater: inWater, sunk: sunk);
}

class EnvironmentConditions {
  const EnvironmentConditions({
    required this.windSpeed,
    required this.windDirection,
    required this.temperature,
    required this.altitude,
  });

  /// 0-20 km/h.
  final double windSpeed;

  /// Degrees: 0 right, 90 down, 180 left, 270 up.
  final double windDirection;

  /// -10 to 45 C.
  final double temperature;

  /// 0-3000 m.
  final double altitude;
}

/// Wind push per tick, subtle on purpose (web).
Vec2 getWindForce(EnvironmentConditions env) {
  final rad = env.windDirection * math.pi / 180;
  final magnitude = env.windSpeed * 0.0006;
  return Vec2(math.cos(rad) * magnitude, math.sin(rad) * magnitude);
}

/// Cold means less friction (rolls farther), heat means more.
double getTemperatureFrictionMultiplier(double temperature) {
  if (temperature < 5) return 1.005 + (5 - temperature) * 0.0008;
  if (temperature > 35) return 0.995 - (temperature - 35) * 0.001;
  return 1.0;
}

/// Thinner air at altitude: less drag.
double getAltitudeDragMultiplier(double altitude) => 1.0 + altitude * 0.0000025;

/// JS `Math.round` for the non-negative values used here.
int _round(double v) => (v + 0.5).floor();

/// Random conditions for a hole; harder courses get harsher ones.
/// [rng] is `Random.nextDouble` so tests can replay a sequence.
EnvironmentConditions generateEnvironment(String difficulty, double Function() rng) {
  if (difficulty == 'easy') {
    return EnvironmentConditions(
      windSpeed: _round(rng() * 5).toDouble(),
      windDirection: _round(rng() * 360).toDouble(),
      temperature: (18 + _round(rng() * 10)).toDouble(),
      altitude: _round(rng() * 500).toDouble(),
    );
  }
  if (difficulty == 'medium') {
    return EnvironmentConditions(
      windSpeed: (3 + _round(rng() * 10)).toDouble(),
      windDirection: _round(rng() * 360).toDouble(),
      temperature: (5 + _round(rng() * 35)).toDouble(),
      altitude: _round(rng() * 1500).toDouble(),
    );
  }
  return EnvironmentConditions(
    windSpeed: (8 + _round(rng() * 12)).toDouble(),
    windDirection: _round(rng() * 360).toDouble(),
    temperature: (-5 + _round(rng() * 45)).toDouble(),
    altitude: (500 + _round(rng() * 2500)).toDouble(),
  );
}

Vec2 _closestPointOnSegment(Vec2 p, Vec2 a, Vec2 b) {
  final ab = b - a;
  final ap = p - a;
  var t = ap.dot(ab) / ab.dot(ab);
  t = math.max(0, math.min(1, t));
  return a + ab.scaled(t);
}

typedef WallHit = ({bool hit, Vec2 point, Vec2 normal});

WallHit checkWallCollision(Vec2 ballPos, Wall wall) {
  final closest = _closestPointOnSegment(ballPos, wall.start, wall.end);
  final dist = ballPos.distanceTo(closest);
  if (dist <= kGolfPhysics.ballRadius) {
    return (hit: true, point: closest, normal: (ballPos - closest).normalized());
  }
  return (hit: false, point: closest, normal: Vec2.zero);
}

bool _isPointInRect(Vec2 p, Obstacle obs) {
  final w = _orDefault(obs.width, 40);
  final h = _orDefault(obs.height, 40);
  return p.x >= obs.x && p.x <= obs.x + w && p.y >= obs.y && p.y <= obs.y + h;
}

/// JS `value || fallback`: null and 0 both fall back.
double _orDefault(double? v, double fallback) => (v == null || v == 0) ? fallback : v;

/// The four blades of a windmill at [timeMs].
List<Wall> getWindmillBladeWalls(Obstacle obs, double timeMs) {
  final speed = _orDefault(obs.speed, 2);
  final angle = (timeMs * speed * 0.001).remainder(math.pi * 2);
  final r = _orDefault(obs.radius, 50);
  final center = Vec2(obs.x, obs.y);
  return [
    for (var i = 0; i < 4; i++)
      Wall(
        center,
        Vec2(
          center.x + math.cos(angle + i * math.pi / 2) * r,
          center.y + math.sin(angle + i * math.pi / 2) * r,
        ),
      ),
  ];
}

/// One fixed step. [timeMs] drives the windmill blades only.
BallState physicsTick(BallState ball, Hole hole, double timeMs, EnvironmentConditions env) {
  if (ball.sunk) return ball;
  const p = kGolfPhysics;
  var pos = ball.pos;
  var vel = ball.vel;
  var inSand = false;
  var inWater = false;

  // Wind only acts on a moving ball, so a resting ball never drifts.
  if (vel.length > 0.5) vel = vel + getWindForce(env);

  pos = pos + vel;

  for (final obs in hole.obstacles) {
    if (obs.type == 'sand' && _isPointInRect(pos, obs)) inSand = true;
    if (obs.type == 'water' && _isPointInRect(pos, obs)) inWater = true;
  }

  final tempMult = getTemperatureFrictionMultiplier(env.temperature);
  final altMult = getAltitudeDragMultiplier(env.altitude);
  final baseFriction = inSand ? p.sandFriction : p.friction;
  final effectiveFriction = math.min(0.999, baseFriction * tempMult * altMult);
  vel = vel.scaled(effectiveFriction);

  void bounceOffWall(Wall wall) {
    final result = checkWallCollision(pos, wall);
    if (!result.hit) return;
    vel = vel.reflect(result.normal).scaled(p.wallBounce);
    final overlap = p.ballRadius - pos.distanceTo(result.point);
    if (overlap > 0) pos = pos + result.normal.scaled(overlap + 1);
  }

  for (final wall in hole.walls) {
    bounceOffWall(wall);
  }
  for (final obs in hole.obstacles) {
    if (obs.type != 'windmill') continue;
    for (final blade in getWindmillBladeWalls(obs, timeMs)) {
      bounceOffWall(blade);
    }
  }

  for (final obs in hole.obstacles) {
    if (obs.type != 'bumper') continue;
    final r = _orDefault(obs.radius, 14);
    final center = Vec2(obs.x, obs.y);
    final dist = pos.distanceTo(center);
    if (dist <= p.ballRadius + r) {
      final normal = (pos - center).normalized();
      vel = vel.reflect(normal).scaled(p.bumperBounce);
      final pushDist = p.ballRadius + r - dist + 1;
      if (pushDist > 0) pos = pos + normal.scaled(pushDist);
    }
  }

  final currentSpeed = vel.length;
  if (pos.distanceTo(hole.cup) <= p.cupRadius && currentSpeed < 6) {
    return BallState(pos: hole.cup, sunk: true);
  }
  if (currentSpeed < p.minVelocity) vel = Vec2.zero;
  return BallState(pos: pos, vel: vel, inSand: inSand, inWater: inWater);
}

bool isBallMoving(BallState ball) => ball.vel.length >= kGolfPhysics.minVelocity;

/// Shot power from the drag length (canvas units).
double calculatePower(double dragDistance) =>
    math.min(kGolfPhysics.maxPower, dragDistance * 0.1);

/// Unit direction of a shot: from the pull-back point through the ball.
Vec2 calculateDirection(Vec2 ballPos, Vec2 dragPos) => (ballPos - dragPos).normalized();
