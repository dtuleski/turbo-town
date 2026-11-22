import 'package:dashden_mobile/game/mini_golf/data.dart';
import 'package:dashden_mobile/game/mini_golf/physics.dart';
import 'package:flutter_test/flutter_test.dart';

const EnvironmentConditions _calm =
    EnvironmentConditions(windSpeed: 0, windDirection: 0, temperature: 20, altitude: 0);

Hole _box({List<Obstacle> obstacles = const []}) => Hole(
      id: 't',
      name: 't',
      par: 2,
      ball: const Vec2(100, 300),
      cup: const Vec2(500, 300),
      walls: const [
        Wall(Vec2(40, 200), Vec2(560, 200)),
        Wall(Vec2(40, 400), Vec2(560, 400)),
        Wall(Vec2(40, 200), Vec2(40, 400)),
        Wall(Vec2(560, 200), Vec2(560, 400)),
      ],
      obstacles: obstacles,
    );

BallState _run(BallState ball, Hole hole, int ticks, {EnvironmentConditions env = _calm}) {
  var b = ball;
  for (var i = 0; i < ticks; i++) {
    b = physicsTick(b, hole, i * kGolfPhysics.tickRateMs, env);
  }
  return b;
}

void main() {
  test('courses come from the web data: 3 courses, 10 holes', () {
    expect(kGolfCourses.map((c) => c.difficulty), ['easy', 'medium', 'hard']);
    expect(kGolfCourses.expand((c) => c.holes), hasLength(10));
    expect(golfCourse('easy').holes, hasLength(3));
    expect(golfCourse('easy').totalPar, 7);
    expect(golfCourse('nonsense').id, golfCourse('easy').id);
    expect([for (final d in ['easy', 'medium', 'hard']) golfDifficultyValue(d)], [1, 2, 3]);
    expect([for (final d in ['easy', 'medium', 'hard']) kGolfMaxStrokes[d]], [8, 7, 6]);
  });

  test('the same shot always gives the same ball', () {
    final hole = golfCourse('medium').holes[1].scaledBy(kGolfScale);
    final start = BallState(pos: hole.ball, vel: const Vec2(7, 3));
    final a = _run(start, hole, 400);
    final b = _run(start, hole, 400);
    expect(a.pos, b.pos);
    expect(a.vel, b.vel);
  });

  test('friction slows a free ball to a stop', () {
    final hole = _box();
    final end = _run(const BallState(pos: Vec2(100, 300), vel: Vec2(6, 0)), hole, 600);
    expect(isBallMoving(end), isFalse);
    expect(end.vel, Vec2.zero);
    expect(end.pos.x, greaterThan(100));
    expect(end.sunk, isFalse);
  });

  test('a ball bounces off a wall and loses speed', () {
    final hole = _box();
    const start = BallState(pos: Vec2(80, 300), vel: Vec2(-8, 0));
    var b = start;
    for (var i = 0; i < 30 && b.vel.x <= 0; i++) {
      b = physicsTick(b, hole, 0, _calm);
    }
    expect(b.vel.x, greaterThan(0), reason: 'turned around at the wall');
    expect(b.vel.x, lessThan(8 * kGolfPhysics.wallBounce + 0.01));
  });

  test('sand slows the ball more than grass', () {
    final grass = _run(const BallState(pos: Vec2(100, 300), vel: Vec2(6, 0)), _box(), 60);
    final sandy = _run(
      const BallState(pos: Vec2(100, 300), vel: Vec2(6, 0)),
      _box(obstacles: const [Obstacle(type: 'sand', x: 60, y: 240, width: 400, height: 120)]),
      60,
    );
    expect(sandy.pos.x, lessThan(grass.pos.x));
    expect(sandy.inSand, isTrue);
  });

  test('a ball that stops in water is flagged', () {
    final hole = _box(obstacles: const [Obstacle(type: 'water', x: 300, y: 240, width: 100, height: 120)]);
    final end = _run(const BallState(pos: Vec2(100, 300), vel: Vec2(7, 0)), hole, 600);
    expect(end.inWater, isTrue);
    expect(isBallMoving(end), isFalse);
  });

  test('a bumper throws the ball back faster than it came (1.3x bounce)', () {
    final hole = _box(obstacles: const [Obstacle(type: 'bumper', x: 300, y: 300, radius: 20)]);
    var b = const BallState(pos: Vec2(230, 300), vel: Vec2(6, 0));
    var bounced = false;
    for (var i = 0; i < 60 && !bounced; i++) {
      b = physicsTick(b, hole, 0, _calm);
      bounced = b.vel.x < 0;
    }
    expect(bounced, isTrue);
    expect(b.vel.x.abs(), greaterThan(6 * 0.975 * 0.9));
  });

  test('a slow ball over the cup sinks, a fast one rolls past', () {
    final hole = _box();
    final slow = physicsTick(const BallState(pos: Vec2(495, 300), vel: Vec2(2, 0)), hole, 0, _calm);
    expect(slow.sunk, isTrue);
    expect(slow.pos, hole.cup);
    expect(slow.vel, Vec2.zero);
    final fast = physicsTick(const BallState(pos: Vec2(495, 300), vel: Vec2(9, 0)), hole, 0, _calm);
    expect(fast.sunk, isFalse);
    expect(physicsTick(slow, hole, 0, _calm), same(slow), reason: 'a sunk ball no longer moves');
  });

  test('wind pushes a moving ball but never a resting one', () {
    const gale = EnvironmentConditions(windSpeed: 20, windDirection: 90, temperature: 20, altitude: 0);
    final hole = _box();
    final resting = physicsTick(const BallState(pos: Vec2(100, 300)), hole, 0, gale);
    expect(resting.pos, const Vec2(100, 300));
    final moving = physicsTick(const BallState(pos: Vec2(100, 300), vel: Vec2(2, 0)), hole, 0, gale);
    expect(moving.vel.y, greaterThan(0), reason: 'direction 90 is down');
    final f = getWindForce(gale);
    expect(f.y, closeTo(20 * 0.0006, 1e-12));
    expect(f.x, closeTo(0, 1e-12));
  });

  test('cold rolls farther than hot; thin air rolls farther than sea level', () {
    expect(getTemperatureFrictionMultiplier(-5), greaterThan(getTemperatureFrictionMultiplier(20)));
    expect(getTemperatureFrictionMultiplier(40), lessThan(getTemperatureFrictionMultiplier(20)));
    expect(getTemperatureFrictionMultiplier(20), 1.0);
    expect(getAltitudeDragMultiplier(3000), greaterThan(getAltitudeDragMultiplier(0)));
    expect(getAltitudeDragMultiplier(0), 1.0);
  });

  test('windmill blades turn with time and keep four arms', () {
    const mill = Obstacle(type: 'windmill', x: 300, y: 300, radius: 50, speed: 2);
    final a = getWindmillBladeWalls(mill, 0);
    final b = getWindmillBladeWalls(mill, 300);
    expect(a, hasLength(4));
    expect(a.first.end, isNot(b.first.end));
    expect(a.first.end.x, closeTo(350, 1e-9));
    expect(a.first.end.y, closeTo(300, 1e-9));
  });

  test('shot power and direction', () {
    expect(calculatePower(50), 5);
    expect(calculatePower(5000), kGolfPhysics.maxPower);
    final dir = calculateDirection(const Vec2(100, 100), const Vec2(100, 160));
    expect(dir.x, 0);
    expect(dir.y, -1, reason: 'pull down to shoot up');
    expect(calculateDirection(const Vec2(1, 1), const Vec2(1, 1)), Vec2.zero);
  });

  test('scaling a hole to the 600 field scales walls, cup and obstacles', () {
    final hole = golfCourse('medium').holes.firstWhere((h) => h.obstacles.any((o) => o.type == 'sand'));
    final s = hole.scaledBy(kGolfScale);
    expect(s.cup.x, hole.cup.x * 1.5);
    expect(s.walls.first.end.y, hole.walls.first.end.y * 1.5);
    final sand = hole.obstacles.firstWhere((o) => o.type == 'sand');
    final sandS = s.obstacles.firstWhere((o) => o.type == 'sand');
    expect(sandS.width, sand.width! * 1.5);
  });

  test('accuracy: par is 100%, the stroke limit is 0%, squared in between', () {
    int acc(int strokes) =>
        golfAccuracyPercent(totalStrokes: strokes, totalPar: 7, holes: 3, maxStrokesPerHole: 8);
    expect(acc(7), 100);
    expect(acc(5), 100, reason: 'under par is capped');
    expect(acc(24), 0);
    expect(acc(30), 0);
    expect(acc(15), 28, reason: 'raw 9/17 squared');
    expect(golfScoreName(1, 3), GolfScoreName.eagle);
  });
}
