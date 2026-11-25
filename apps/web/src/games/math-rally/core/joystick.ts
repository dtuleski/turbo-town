/** Joystick model and visibility (G8). Pure: the view feeds it pointer positions. */
export interface JoystickConfig {
  thresholdRatio: number;
  repeatDelayMs: number;
  repeatIntervalMs: number;
}

/** MR1 FD Section 6. */
export const DEFAULT_JOYSTICK: Readonly<JoystickConfig> = Object.freeze({
  thresholdRatio: 0.35,
  repeatDelayMs: 400,
  repeatIntervalMs: 250,
});

export interface JoystickState {
  active: boolean;
  side: -1 | 0 | 1;
  nextRepeatAt: number | null;
}

export const JOYSTICK_IDLE: Readonly<JoystickState> = Object.freeze({ active: false, side: 0, nextRepeatAt: null });

/**
 * dxRatio: horizontal offset from the knob's centre divided by the knob radius, or null when released.
 * Crossing the threshold gives one action at once; holding repeats after the delay.
 */
export function joystickStep(
  s: JoystickState,
  input: { dxRatio: number | null; nowMs: number },
  c: JoystickConfig = DEFAULT_JOYSTICK
): { state: JoystickState; actions: ('left' | 'right')[] } {
  if (input.dxRatio === null) return { state: { ...JOYSTICK_IDLE }, actions: [] };
  const side: -1 | 0 | 1 = input.dxRatio <= -c.thresholdRatio ? -1 : input.dxRatio >= c.thresholdRatio ? 1 : 0;
  if (side === 0) return { state: { active: true, side: 0, nextRepeatAt: null }, actions: [] };
  const action = side < 0 ? 'left' : 'right';
  if (s.side !== side) {
    return { state: { active: true, side, nextRepeatAt: input.nowMs + c.repeatDelayMs }, actions: [action] };
  }
  const actions: ('left' | 'right')[] = [];
  let next = s.nextRepeatAt;
  while (next !== null && input.nowMs >= next) {
    actions.push(action);
    next += c.repeatIntervalMs;
  }
  return { state: { active: true, side, nextRepeatAt: next }, actions };
}

export function joystickVisible(touchUi: boolean, touchSeen: boolean): boolean {
  return touchUi || touchSeen;
}
