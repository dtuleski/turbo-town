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
 * Lateral offset of a fork branch (MR1 FD Section 4), in road-width units:
 * (i - (paths - 1) / 2) x spacing x sin(pi x d / forkLength); 0 at the split (d = 0) and the merge.
 */
export function branchOffset(
  distanceIntoFork: number,
  branchIndex: number,
  paths: number,
  forkLength: number,
  spacing: number
): number {
  if (distanceIntoFork <= 0 || distanceIntoFork >= forkLength) return 0;
  return (branchIndex - (paths - 1) / 2) * spacing * Math.sin((Math.PI * distanceIntoFork) / forkLength);
}
