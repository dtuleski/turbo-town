import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

/// Turns frame time into fixed steps: [onStep] runs once per [step] of real
/// time, however the frames fall. Games use it so their rules advance by a
/// fixed amount per call, which keeps them deterministic and independent of
/// the screen's refresh rate.
class StepClock extends StatefulWidget {
  const StepClock({
    super.key,
    required this.step,
    required this.onStep,
    required this.child,
    this.running = true,
    this.maxStepsPerFrame,
  });

  final Duration step;
  final VoidCallback onStep;
  final Widget child;

  /// Steps are skipped (not queued) while false.
  final bool running;

  /// After a long frame (the app was in the background) at most this many
  /// steps run and the rest of the time is dropped. Null runs them all.
  final int? maxStepsPerFrame;

  @override
  State<StepClock> createState() => _StepClockState();
}

class _StepClockState extends State<StepClock> with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_onTick);
  Duration _last = Duration.zero;
  Duration _pending = Duration.zero;

  @override
  void initState() {
    super.initState();
    _ticker.start();
  }

  void _onTick(Duration elapsed) {
    final delta = elapsed - _last;
    _last = elapsed;
    if (!widget.running) {
      _pending = Duration.zero;
      return;
    }
    _pending += delta;
    var steps = _pending.inMicroseconds ~/ widget.step.inMicroseconds;
    final max = widget.maxStepsPerFrame;
    if (max != null && steps > max) {
      steps = max;
      _pending = Duration.zero;
    } else {
      _pending -= widget.step * steps;
    }
    for (var i = 0; i < steps; i++) {
      if (!mounted || !widget.running) return;
      widget.onStep();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
