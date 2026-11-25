/** Lanes (G7): one action moves one lane, clamped to the road. */
export interface LaneState {
  count: number;
  lane: number;
}

export function moveLane(s: LaneState, action: 'left' | 'right'): LaneState {
  const lane = action === 'left' ? s.lane - 1 : s.lane + 1;
  return { count: s.count, lane: Math.min(Math.max(lane, 0), s.count - 1) };
}

/** Keeps the nearest valid lane when the road changes width. */
export function resizeLanes(s: LaneState, newCount: number): LaneState {
  if (newCount < 1) throw new RangeError('at least one lane');
  if (s.count === newCount) return s;
  const centre = s.count <= 1 ? 0.5 : s.lane / (s.count - 1);
  const lane = newCount === 1 ? 0 : Math.round(centre * (newCount - 1));
  return { count: newCount, lane };
}
