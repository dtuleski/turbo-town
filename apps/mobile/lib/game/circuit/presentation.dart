// Numeric disclosure (web `circuitPresentation.ts`, `circuitSliderLabel.ts`).
// Engine values are referenced to the positive rail and signed by current
// direction; learners expect positive numbers. A tier builds its objects from
// an explicit field list, so a number a tier must not show is absent, not hidden.
import 'package:intl/intl.dart';

import 'engine/engine.dart';

enum ElementVisualState { lit, dim, dark, spark }

enum BrightnessLabel { off, dim, medium, bright }

class PresentedElement {
  const PresentedElement({
    required this.elementId,
    required this.kind,
    required this.state,
    this.brightness,
    this.relativeBrightness,
    this.voltage,
    this.resistance,
    this.current,
  });
  final String elementId;
  final ElementKind kind;
  final ElementVisualState state;

  /// Qualitative and above.
  final BrightnessLabel? brightness;
  final double? relativeBrightness;

  /// Values and above: volts, never negative.
  final double? voltage;

  /// Values and above: ohms, never negative. Loads only.
  final double? resistance;

  /// Full only: amperes, never negative.
  final double? current;
}

class PresentedCircuit {
  const PresentedCircuit({
    required this.tier,
    required this.elements,
    this.supplyVoltage,
    this.totalResistance,
    this.totalCurrent,
  });
  final NumericDisclosure tier;
  final List<PresentedElement> elements;
  final double? supplyVoltage;
  final double? totalResistance;
  final double? totalCurrent;
}

const double _dimIntensity = 0.4;
const double _mediumIntensity = 0.75;
const List<ElementKind> _resistanceKinds = [
  ElementKind.resistor,
  ElementKind.led,
  ElementKind.motor,
  ElementKind.buzzer,
];

bool _isRated(ElementKind kind) => kElementSpecs[kind]!.ratedCurrent != null;

/// A finite number becomes its magnitude; NaN, Infinity and -0 become 0.
double toDisplayMagnitude(double n) {
  if (!n.isFinite) return 0;
  final m = n.abs();
  return m == 0 ? 0 : m;
}

double _clampUnit(double v) => (!v.isFinite || v <= 0) ? 0 : (v > 1 ? 1 : v);

BrightnessLabel _brightnessLabel(double intensity) {
  if (!(intensity > 0)) return BrightnessLabel.off;
  if (intensity < _dimIntensity) return BrightnessLabel.dim;
  return intensity < _mediumIntensity ? BrightnessLabel.medium : BrightnessLabel.bright;
}

double? _resistanceOf(ElementKind kind, CircuitLayout layout, String id) {
  if (!_resistanceKinds.contains(kind)) return null;
  final fixed = kElementSpecs[kind]!.resistance;
  if (fixed != null) return toDisplayMagnitude(fixed);
  for (final e in layout.elements) {
    if (e.id == id) {
      return toDisplayMagnitude(e.params?['resistance'] ?? kDefaultResistorResistance);
    }
  }
  return toDisplayMagnitude(kDefaultResistorResistance);
}

ElementResult? _dominantSource(CircuitResult result) {
  ElementResult? best;
  for (final e in result.elements) {
    if (!kElementSpecs[e.kind]!.isSource) continue;
    final current = toDisplayMagnitude(e.current);
    final bestCurrent = best == null ? -1.0 : toDisplayMagnitude(best.current);
    if (current > bestCurrent ||
        (current == bestCurrent && best != null && e.elementId.compareTo(best.elementId) < 0)) {
      best = e;
    }
  }
  return best;
}

PresentedCircuit presentCircuit(
    CircuitResult result, CircuitLayout layout, NumericDisclosure tier) {
  final faulted = {for (final f in result.faults) ...f.elementIds};
  var maxRated = 0.0;
  for (final e in result.elements) {
    if (_isRated(e.kind)) {
      final v = _clampUnit(e.intensity);
      if (v > maxRated) maxRated = v;
    }
  }
  final showBrightness = tier != NumericDisclosure.none;
  final showValues = tier == NumericDisclosure.valuesTier || tier == NumericDisclosure.full;
  final showFull = tier == NumericDisclosure.full;

  final elements = [
    for (final e in result.elements)
      () {
        final intensity = _clampUnit(e.intensity);
        final state = faulted.contains(e.elementId)
            ? ElementVisualState.spark
            : (!e.energized
                ? ElementVisualState.dark
                : (_isRated(e.kind) && intensity < _dimIntensity
                    ? ElementVisualState.dim
                    : ElementVisualState.lit));
        return PresentedElement(
          elementId: e.elementId,
          kind: e.kind,
          state: state,
          brightness: showBrightness ? _brightnessLabel(intensity) : null,
          relativeBrightness:
              showBrightness ? (_isRated(e.kind) && maxRated > 0 ? intensity / maxRated : 0) : null,
          voltage: showValues ? toDisplayMagnitude(e.voltageDrop) : null,
          resistance: showValues ? _resistanceOf(e.kind, layout, e.elementId) : null,
          current: showFull ? toDisplayMagnitude(e.current) : null,
        );
      }(),
  ];
  final source = showValues ? _dominantSource(result) : null;
  return PresentedCircuit(
    tier: tier,
    elements: elements,
    supplyVoltage:
        showValues ? (source == null ? 0 : toDisplayMagnitude(source.voltageDrop)) : null,
    totalResistance: showFull
        ? (result.closedPathExists ? toDisplayMagnitude(result.totalResistance) : 0)
        : null,
    totalCurrent:
        showFull ? (result.closedPathExists ? toDisplayMagnitude(result.totalCurrent) : 0) : null,
  );
}

enum QuantityUnit { volts, ohms, amps }

/// `V`, `Ω` or `A` with the locale's decimal separator. Currents below 1 A read in mA.
String formatQuantity(double value, QuantityUnit unit, String locale) {
  final m = toDisplayMagnitude(value);
  String fmt(double n, int digits) {
    final f = NumberFormat.decimalPatternDigits(locale: locale, decimalDigits: 0)
      ..maximumFractionDigits = digits
      ..minimumFractionDigits = 0;
    return f.format(n);
  }

  switch (unit) {
    case QuantityUnit.amps:
      return m < 1 ? '${fmt(toDisplayMagnitude(m * 1000), 1)} mA' : '${fmt(m, 2)} A';
    case QuantityUnit.volts:
      return '${fmt(m, 2)} V';
    case QuantityUnit.ohms:
      return '${fmt(m, 1)} Ω';
  }
}

/// Wire is live when both parts it joins carry current (web `isConnectionEnergized`).
bool isConnectionEnergized(ElementResult? from, ElementResult? to, bool suppressed) {
  bool carrying(ElementResult? r) =>
      r != null && (r.energized || r.current.abs() > kCurrentEpsilon);
  return !suppressed && carrying(from) && carrying(to);
}

enum SliderKind { voltage, light }

/// Numeric suffix a slider may show, or null when the tier shows no digits.
String? sliderValueText(NumericDisclosure tier, SliderKind kind, double value) {
  if (tier != NumericDisclosure.valuesTier && tier != NumericDisclosure.full) return null;
  if (kind == SliderKind.voltage) {
    final v = value == value.roundToDouble() ? value.toInt().toString() : value.toString();
    return '$v V';
  }
  return '${(value * 100).round()}%';
}
