import 'dart:convert';

import '../data/physics_data.g.dart';
import 'physics.dart';

/// Mini Golf courses and constants. The tables come from the web through
/// `tools/export_physics_data.mjs`; [kGolfPhysics] values are the web `PHYSICS`.

class Wall {
  const Wall(this.start, this.end);
  final Vec2 start;
  final Vec2 end;
}

class Obstacle {
  const Obstacle({
    required this.type,
    required this.x,
    required this.y,
    this.width,
    this.height,
    this.radius,
    this.speed,
  });

  /// circle, rect, windmill, bumper, sand or water.
  final String type;
  final double x;
  final double y;
  final double? width;
  final double? height;
  final double? radius;
  final double? speed;

  factory Obstacle.fromJson(Map<String, dynamic> j) => Obstacle(
        type: j['type'] as String,
        x: (j['x'] as num).toDouble(),
        y: (j['y'] as num).toDouble(),
        width: (j['width'] as num?)?.toDouble(),
        height: (j['height'] as num?)?.toDouble(),
        radius: (j['radius'] as num?)?.toDouble(),
        speed: (j['speed'] as num?)?.toDouble(),
      );

  /// Same obstacle with every length multiplied by [s] (web `scaledHole`).
  Obstacle scaledBy(double s) => Obstacle(
        type: type,
        x: x * s,
        y: y * s,
        width: (width == null || width == 0) ? null : width! * s,
        height: (height == null || height == 0) ? null : height! * s,
        radius: (radius == null || radius == 0) ? null : radius! * s,
        speed: speed,
      );
}

class Hole {
  const Hole({
    required this.id,
    required this.name,
    required this.par,
    required this.ball,
    required this.cup,
    required this.walls,
    required this.obstacles,
  });
  final String id;
  final String name;
  final int par;
  final Vec2 ball;
  final Vec2 cup;
  final List<Wall> walls;
  final List<Obstacle> obstacles;

  static Vec2 _vec(Map<String, dynamic> j) =>
      Vec2((j['x'] as num).toDouble(), (j['y'] as num).toDouble());

  factory Hole.fromJson(Map<String, dynamic> j) => Hole(
        id: j['id'] as String,
        name: j['name'] as String,
        par: (j['par'] as num).toInt(),
        ball: _vec(j['ball'] as Map<String, dynamic>),
        cup: _vec(j['cup'] as Map<String, dynamic>),
        walls: [
          for (final w in j['walls'] as List)
            Wall(_vec((w as Map<String, dynamic>)['start'] as Map<String, dynamic>),
                _vec(w['end'] as Map<String, dynamic>)),
        ],
        obstacles: [
          for (final o in j['obstacles'] as List) Obstacle.fromJson(o as Map<String, dynamic>),
        ],
      );

  /// The hole in the 600x600 play field (web draws and simulates at 1.5x).
  Hole scaledBy(double s) => Hole(
        id: id,
        name: name,
        par: par,
        ball: ball.scaled(s),
        cup: cup.scaled(s),
        walls: [for (final w in walls) Wall(w.start.scaled(s), w.end.scaled(s))],
        obstacles: [for (final o in obstacles) o.scaledBy(s)],
      );
}

class Course {
  const Course({required this.id, required this.name, required this.emoji, required this.difficulty, required this.holes});
  final String id;
  final String name;
  final String emoji;
  final String difficulty;
  final List<Hole> holes;

  int get totalPar => holes.fold(0, (sum, h) => sum + h.par);
}

class GolfPhysics {
  const GolfPhysics({
    required this.ballRadius,
    required this.cupRadius,
    required this.friction,
    required this.sandFriction,
    required this.minVelocity,
    required this.maxPower,
    required this.wallBounce,
    required this.bumperBounce,
    required this.tickRateMs,
  });
  final double ballRadius;
  final double cupRadius;
  final double friction;
  final double sandFriction;
  final double minVelocity;
  final double maxPower;
  final double wallBounce;
  final double bumperBounce;

  /// Milliseconds per physics step (60 per second).
  final double tickRateMs;
}

/// Web `PHYSICS`. A test compares each value with the web export.
const GolfPhysics kGolfPhysics = GolfPhysics(
  ballRadius: 8,
  cupRadius: 12,
  friction: 0.975,
  sandFriction: 0.92,
  minVelocity: 0.3,
  maxPower: 14,
  wallBounce: 0.65,
  bumperBounce: 1.3,
  tickRateMs: 1000 / 60,
);

/// Web hole data is 400x400, the play field 600x600.
const double kGolfFieldSize = 600;
const double kGolfScale = kGolfFieldSize / 400;

/// Strokes allowed per hole by difficulty (web `DIFFICULTY_CONFIGS`).
final Map<String, int> kGolfMaxStrokes = () {
  final configs = _json['configs'] as Map<String, dynamic>;
  return {
    for (final e in configs.entries) e.key: ((e.value as Map<String, dynamic>)['maxStrokes'] as num).toInt(),
  };
}();

final Map<String, dynamic> _json = jsonDecode(kMiniGolfDataJson) as Map<String, dynamic>;

final List<Course> kGolfCourses = [
  for (final c in _json['courses'] as List)
    Course(
      id: (c as Map<String, dynamic>)['id'] as String,
      name: c['name'] as String,
      emoji: c['emoji'] as String,
      difficulty: c['difficulty'] as String,
      holes: [for (final h in c['holes'] as List) Hole.fromJson(h as Map<String, dynamic>)],
    ),
];

/// Raw web `PHYSICS` object, for the parity test.
Map<String, dynamic> get golfPhysicsJson => _json['physics'] as Map<String, dynamic>;

/// Web `getCourse`: the course of a difficulty.
Course golfCourse(String difficulty) {
  final configs = _json['configs'] as Map<String, dynamic>;
  final cfg = (configs[difficulty] ?? configs['easy']) as Map<String, dynamic>;
  final id = (cfg['courses'] as List).first as String;
  return kGolfCourses.firstWhere((c) => c.id == id);
}

/// Server difficulty number (web `difficultyToNumber`).
int golfDifficultyValue(String difficulty) =>
    difficulty == 'hard' ? 3 : (difficulty == 'medium' ? 2 : 1);

/// Web `getScoreName`: name of a hole result against par.
enum GolfScoreName { albatross, eagle, birdie, par, bogey, doubleBogey, tripleBogeyPlus }

GolfScoreName golfScoreName(int strokes, int par) {
  final diff = strokes - par;
  if (diff <= -3) return GolfScoreName.albatross;
  if (diff == -2) return GolfScoreName.eagle;
  if (diff == -1) return GolfScoreName.birdie;
  if (diff == 0) return GolfScoreName.par;
  if (diff == 1) return GolfScoreName.bogey;
  if (diff == 2) return GolfScoreName.doubleBogey;
  return GolfScoreName.tripleBogeyPlus;
}

/// The accuracy the web sends as correctAnswers out of 100: par is 100%,
/// the stroke limit is 0%, squared so bad play costs more.
int golfAccuracyPercent({
  required int totalStrokes,
  required int totalPar,
  required int holes,
  required int maxStrokesPerHole,
}) {
  final maxTotal = holes * maxStrokesPerHole;
  final raw = ((maxTotal - totalStrokes) / (maxTotal - totalPar)).clamp(0.0, 1.0);
  return (raw * raw * 100 + 0.5).floor();
}
