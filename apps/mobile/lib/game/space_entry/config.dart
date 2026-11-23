import 'dart:convert';
import 'dart:math' as math;

import '../data/physics_data.g.dart';

/// Space Entry difficulty settings and landing zones, from the web
/// `spaceEntryConfig.ts` and `spaceEntryLandingZones.ts` (exported by
/// `tools/export_physics_data.mjs`).

const List<String> kSpaceEntryDifficulties = ['easy', 'medium', 'hard'];

class SpaceEntryConfig {
  const SpaceEntryConfig({
    required this.idealAngleMin,
    required this.idealAngleMax,
    required this.tolerance,
    required this.initialHeatShield,
    required this.baseDegradationRate,
    required this.referenceAngle,
    required this.turbulenceRange,
    required this.countdownSeconds,
    required this.showAngleHint,
    required this.showThrusterPower,
    required this.showLateralCorrection,
    required this.optimalThrusterPower,
    required this.thrusterTolerance,
    required this.latSensitivity,
    required this.lngSensitivity,
    required this.distancePenalty,
    required this.bonusPuzzleCount,
    required this.wrongAnswerPenalty,
  });

  final double idealAngleMin;
  final double idealAngleMax;
  final double tolerance;
  final double initialHeatShield;
  final double baseDegradationRate;
  final double referenceAngle;

  /// 0 for easy and medium.
  final double turbulenceRange;

  /// Time to set the controls before the auto-fire.
  final int countdownSeconds;
  final bool showAngleHint;
  final bool showThrusterPower;
  final bool showLateralCorrection;
  final double optimalThrusterPower;
  final double thrusterTolerance;
  final double latSensitivity;
  final double lngSensitivity;
  final double distancePenalty;
  final int bonusPuzzleCount;
  final double wrongAnswerPenalty;

  /// Angle puzzle, plus thruster and lateral where the difficulty shows them.
  int get controlPuzzleCount =>
      1 + (showThrusterPower ? 1 : 0) + (showLateralCorrection ? 1 : 0);

  int get totalPuzzles => controlPuzzleCount + bonusPuzzleCount;

  factory SpaceEntryConfig.fromJson(Map<String, dynamic> j) => SpaceEntryConfig(
        idealAngleMin: (j['idealAngleMin'] as num).toDouble(),
        idealAngleMax: (j['idealAngleMax'] as num).toDouble(),
        tolerance: (j['tolerance'] as num).toDouble(),
        initialHeatShield: (j['initialHeatShield'] as num).toDouble(),
        baseDegradationRate: (j['baseDegradationRate'] as num).toDouble(),
        referenceAngle: (j['referenceAngle'] as num).toDouble(),
        turbulenceRange: (j['turbulenceRange'] as num).toDouble(),
        countdownSeconds: (j['countdownSeconds'] as num).toInt(),
        showAngleHint: j['showAngleHint'] as bool,
        showThrusterPower: j['showThrusterPower'] as bool,
        showLateralCorrection: j['showLateralCorrection'] as bool,
        optimalThrusterPower: (j['optimalThrusterPower'] as num).toDouble(),
        thrusterTolerance: (j['thrusterTolerance'] as num).toDouble(),
        latSensitivity: (j['latSensitivity'] as num).toDouble(),
        lngSensitivity: (j['lngSensitivity'] as num).toDouble(),
        distancePenalty: (j['distancePenalty'] as num).toDouble(),
        bonusPuzzleCount: (j['bonusPuzzleCount'] as num).toInt(),
        wrongAnswerPenalty: (j['wrongAnswerPenalty'] as num).toDouble(),
      );
}

class LandingZone {
  const LandingZone({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.elevation,
    required this.biome,
    required this.atmosphericDensity,
    required this.geographyFact,
  });
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final double elevation;
  final String biome;
  final double atmosphericDensity;
  final String geographyFact;

  factory LandingZone.fromJson(Map<String, dynamic> j) => LandingZone(
        id: j['id'] as String,
        name: j['name'] as String,
        latitude: (j['latitude'] as num).toDouble(),
        longitude: (j['longitude'] as num).toDouble(),
        elevation: (j['elevation'] as num).toDouble(),
        biome: j['biome'] as String,
        atmosphericDensity: (j['atmosphericDensity'] as num).toDouble(),
        geographyFact: j['geographyFact'] as String,
      );
}

final Map<String, dynamic> _json = jsonDecode(kSpaceEntryDataJson) as Map<String, dynamic>;

final Map<String, SpaceEntryConfig> _configs = {
  for (final e in (_json['configs'] as Map<String, dynamic>).entries)
    e.key: SpaceEntryConfig.fromJson(e.value as Map<String, dynamic>),
};

/// Config of a difficulty; anything unknown is easy (web).
SpaceEntryConfig spaceEntryConfig(String difficulty) => _configs[difficulty] ?? _configs['easy']!;

final List<LandingZone> kLandingZones = [
  for (final z in _json['zones'] as List) LandingZone.fromJson(z as Map<String, dynamic>),
];

/// Server difficulty number: easy 1, medium 2, hard 3.
int spaceEntryDifficultyValue(String difficulty) =>
    difficulty == 'hard' ? 3 : (difficulty == 'medium' ? 2 : 1);

/// How long the reentry animation runs before the result (web: 4 s).
const Duration kReentryDuration = Duration(seconds: 4);

LandingZone randomLandingZone(math.Random rng) =>
    kLandingZones[(rng.nextDouble() * kLandingZones.length).floor()];
