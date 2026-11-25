/**
 * Visual road shape: curves and hills per segment. Visual only: it never changes positions or
 * times (motion is one-dimensional along the track), so it is not part of the race protocol.
 * Roads are kept straight and flat around each fork so the branches and signs read clearly.
 */
export interface SegmentShape {
  curve: number;
  hill: number;
}

export function segmentShape(segmentIndex: number, calm: boolean): SegmentShape {
  if (calm) return { curve: 0, hill: 0 };
  const s = segmentIndex;
  const curve = 2.2 * Math.sin(s / 37) + 1.1 * Math.sin(s / 13 + 1.3);
  const hill = 900 * Math.sin(s / 29) + 350 * Math.sin(s / 11 + 0.7);
  return { curve, hill };
}

/** Calm zone: from 1000 units before a decision line to the merge end. */
export function isCalm(position: number, decisionLines: readonly number[], forkLength: number): boolean {
  for (const d of decisionLines) {
    if (position >= d - 4000 && position <= d + forkLength) return true;
  }
  return false;
}
