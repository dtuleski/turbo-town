/** Projection (G4): pseudo-3D road maths. Pure. */
export interface Camera {
  x: number;
  y: number;
  z: number;
  /** 1 / tan(fov / 2) */
  depth: number;
}

export interface Projected {
  x: number;
  y: number;
  w: number;
  scale: number;
}

/** Projects a world point to the screen; w is the half road width in pixels at that depth. */
export function projectPoint(
  worldX: number,
  worldY: number,
  worldZ: number,
  cam: Camera,
  viewW: number,
  viewH: number,
  roadWidth: number,
  out: Projected = { x: 0, y: 0, w: 0, scale: 0 }
): Projected {
  const dz = Math.max(worldZ - cam.z, 1e-3);
  const scale = cam.depth / dz;
  out.scale = scale;
  out.x = viewW / 2 + (scale * (worldX - cam.x) * viewW) / 2;
  out.y = viewH / 2 - (scale * (worldY - cam.y) * viewH) / 2;
  out.w = (scale * roadWidth * viewW) / 2;
  return out;
}

/** Camera depth for a vertical field of view in degrees. */
export function cameraDepth(fovDegrees: number): number {
  return 1 / Math.tan(((fovDegrees / 2) * Math.PI) / 180);
}

/**
 * Spread factor of the fork branches at distance d past the decision line (MR1 FD Section 4, as built):
 * 1 at the split (branches start at their lanes), widening to 1 + spread at the middle of the branch,
 * then narrowing to 0 over the merge gap (all branches meet in one lane).
 */
export function branchFactor(d: number, branchLength: number, gapLength: number, spread = 0.6): number {
  if (d <= 0) return 1;
  if (d <= branchLength) return 1 + spread * Math.sin((Math.PI * d) / (branchLength + gapLength));
  if (d >= branchLength + gapLength) return 0;
  const atBranchEnd = 1 + spread * Math.sin((Math.PI * branchLength) / (branchLength + gapLength));
  const u = (d - branchLength) / gapLength;
  return atBranchEnd * (1 - u * u * (3 - 2 * u)); // smoothstep down to 0
}

/** Lateral centre of lane or branch i (world units). */
export function branchCenter(
  d: number,
  branchIndex: number,
  paths: number,
  laneWidth: number,
  branchLength: number,
  gapLength: number
): number {
  return (branchIndex - (paths - 1) / 2) * laneWidth * branchFactor(d, branchLength, gapLength);
}
