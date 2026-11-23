import 'dart:math' as math;

import 'config.dart';

/// Space Entry landing physics, ported from apps/web `spaceEntryPhysics.ts`.
/// Pure functions: the controls (entry angle, thruster power, lateral
/// correction) move the predicted landing spot away from the target.

enum LandingOutcome { successfulLanding, orbitalBurnUp, skipOff }

class LandingPrediction {
  const LandingPrediction({
    required this.predictedLat,
    required this.predictedLng,
    required this.distanceKm,
    required this.accuracy,
    required this.heatShieldRemaining,
    required this.outcome,
  });

  /// -90 to 90.
  final double predictedLat;

  /// -180 to 180.
  final double predictedLng;

  /// Great-circle distance from the target.
  final double distanceKm;

  /// 0-100, 100 is a perfect landing.
  final double accuracy;

  /// 0-100.
  final double heatShieldRemaining;
  final LandingOutcome outcome;
}

const double _earthRadiusKm = 6371;

double _toRad(double deg) => deg * math.pi / 180;

double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
  final dLat = _toRad(lat2 - lat1);
  final dLng = _toRad(lng2 - lng1);
  final a = math.pow(math.sin(dLat / 2), 2) +
      math.cos(_toRad(lat1)) * math.cos(_toRad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  return _earthRadiusKm * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

/// A steeper angle burns more of the heat shield.
double calculateHeatShieldDegradation(double entryAngle, SpaceEntryConfig config) {
  final degradation = config.baseDegradationRate * (entryAngle / config.referenceAngle);
  return math.max(0, degradation);
}

LandingPrediction predictLanding(
  double targetLat,
  double targetLng,
  double entryAngle,
  double thrusterPower,
  double lateralCorrection,
  SpaceEntryConfig config, [
  double turbulenceOffset = 0,
]) {
  final effectiveAngle = entryAngle + turbulenceOffset;
  var latOffset = (effectiveAngle - config.referenceAngle) * config.latSensitivity;
  var lngOffset = lateralCorrection * config.lngSensitivity;

  // Thruster power scales both offsets.
  final distanceMultiplier = 1 + (thrusterPower - config.optimalThrusterPower) * 0.02;
  latOffset *= distanceMultiplier;
  lngOffset *= distanceMultiplier;

  final predictedLat = math.max(-90.0, math.min(90.0, targetLat + latOffset));
  final predictedLng = math.max(-180.0, math.min(180.0, targetLng + lngOffset));

  final distanceKm = haversineDistance(predictedLat, predictedLng, targetLat, targetLng);
  final accuracy = math.max(0.0, math.min(100.0, 100 - distanceKm * config.distancePenalty));

  final degradation = calculateHeatShieldDegradation(effectiveAngle, config);
  final heatShieldRemaining =
      math.max(0.0, math.min(100.0, config.initialHeatShield - degradation));

  final LandingOutcome outcome;
  if (heatShieldRemaining <= 0) {
    outcome = LandingOutcome.orbitalBurnUp;
  } else if (accuracy <= 20) {
    outcome = LandingOutcome.skipOff;
  } else {
    outcome = LandingOutcome.successfulLanding;
  }
  return LandingPrediction(
    predictedLat: predictedLat,
    predictedLng: predictedLng,
    distanceKm: distanceKm,
    accuracy: accuracy,
    heatShieldRemaining: heatShieldRemaining,
    outcome: outcome,
  );
}
