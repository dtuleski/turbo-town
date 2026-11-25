import Phaser from 'phaser';
import { branchCenter, projectPoint } from '../../core/projection';
import type { Camera, Projected } from '../../core/projection';
import { isCalm, segmentShape } from '../../core/roadShape';

export const LANE_WIDTH = 1400;
export const CAMERA_HEIGHT = 1100;
export const CAMERA_BEHIND = 1400;
export const WIDEN_LENGTH = 1000;

const COLORS = {
  grassA: 0x7ccf5a,
  grassB: 0x6fc24f,
  roadA: 0x6b7280,
  roadB: 0x646b78,
  rumbleA: 0xf2f2f2,
  rumbleB: 0xe0483f,
  lane: 0xffffff,
  decision: 0xffffff,
  checkerA: 0xffffff,
  checkerB: 0x222222,
};

export interface RoadFrame {
  position: number;
  cameraX: number;
  segmentLength: number;
  drawDistance: number;
  viewW: number;
  viewH: number;
  paths: number;
  questionStart: readonly number[];
  decisionLine: readonly number[];
  mergeEnd: readonly number[];
  finishLine: number;
  branchLength: number;
  gapLength: number;
}

/** Where a world point is on screen, for sprites (filled by `draw`). */
export interface SegmentProjection {
  z: number;
  centerX: number;
  y: number;
  p: Projected;
  visible: boolean;
}

/**
 * One Graphics object, cleared and redrawn each frame (one draw call). Segments are drawn front to
 * back with a running maxY clip, so road hidden behind a hill is skipped (NFR design Section 2).
 * Projection results go into a pre-allocated array (no allocation per frame).
 */
export class RoadRenderer {
  readonly segments: SegmentProjection[];
  /** World segment index of segments[0] in the last draw (first segment in front of the camera). */
  base = 0;
  private readonly near: Projected = { x: 0, y: 0, w: 0, scale: 0 };
  private readonly cam: Camera = { x: 0, y: CAMERA_HEIGHT, z: 0, depth: 0 };

  constructor(private readonly g: Phaser.GameObjects.Graphics, maxSegments: number, depth: number) {
    this.cam.depth = depth;
    this.segments = Array.from({ length: maxSegments + 1 }, () => ({
      z: 0,
      centerX: 0,
      y: 0,
      p: { x: 0, y: 0, w: 0, scale: 0 },
      visible: false,
    }));
  }

  /** The fork at world z, written into a reused object (no allocation per segment). */
  readonly forkInfo = { fork: -1, d: -1, widen: 0 };
  forkAt(z: number, f: RoadFrame): { fork: number; d: number; widen: number } {
    const o = this.forkInfo;
    o.fork = -1;
    o.d = -1;
    o.widen = 0;
    for (let k = 0; k < f.decisionLine.length; k++) {
      const qs = f.questionStart[k] as number;
      const dl = f.decisionLine[k] as number;
      const me = f.mergeEnd[k] as number;
      if (z >= qs && z < dl) {
        o.fork = k;
        o.widen = Math.min(1, (z - qs) / WIDEN_LENGTH);
        return o;
      }
      if (z >= dl && z < me) {
        o.fork = k;
        o.d = z - dl;
        o.widen = 1;
        return o;
      }
    }
    return o;
  }

  draw(f: RoadFrame): void {
    const g = this.g;
    g.clear();
    const seg = f.segmentLength;
    const base = Math.floor((f.position - CAMERA_BEHIND) / seg) + 1;
    this.base = base;
    const forkLength = f.branchLength + f.gapLength;
    this.cam.x = f.cameraX;
    this.cam.z = f.position - CAMERA_BEHIND;
    let maxY = f.viewH;
    let x = 0;
    let dx = 0;
    // Camera height follows the hill under the kart so the road stays in view.
    const under = Math.floor(f.position / seg);
    this.cam.y = CAMERA_HEIGHT + segmentShape(under, isCalm(f.position, f.decisionLine, forkLength)).hill;

    const prev = this.near;
    let havePrev = false;
    const count = Math.min(this.segments.length - 1, f.drawDistance + Math.ceil(CAMERA_BEHIND / seg));
    for (let n = 0; n <= count; n++) {
      const s = base + n;
      const z = s * seg;
      const calm = isCalm(z, f.decisionLine, forkLength);
      const shape = segmentShape(s, calm);
      const out = this.segments[n] as SegmentProjection;
      out.z = z;
      out.centerX = x;
      out.y = shape.hill;
      projectPoint(x, shape.hill, z, this.cam, f.viewW, f.viewH, LANE_WIDTH / 2, out.p);
      out.visible = z > this.cam.z + 1 && out.p.y < maxY;
      dx += shape.curve;
      x += dx;
      if (!havePrev) {
        prev.x = out.p.x;
        prev.y = out.p.y;
        prev.w = out.p.w;
        prev.scale = out.p.scale;
        havePrev = z > this.cam.z + 1;
        continue;
      }
      if (!out.visible) continue;
      this.drawSegment(s, z, prev, out, f, forkLength);
      maxY = out.p.y;
      prev.x = out.p.x;
      prev.y = out.p.y;
      prev.w = out.p.w;
      prev.scale = out.p.scale;
    }
  }

  private quad(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, color: number): void {
    const g = this.g;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x1 - w1, y1 + 1);
    g.lineTo(x1 + w1, y1 + 1);
    g.lineTo(x2 + w2, y2);
    g.lineTo(x2 - w2, y2);
    g.closePath();
    g.fillPath();
  }

  private drawSegment(s: number, z: number, a: Projected, b: SegmentProjection, f: RoadFrame, forkLength: number): void {
    const g = this.g;
    const stripe = s % 6 < 3;
    g.fillStyle(stripe ? COLORS.grassA : COLORS.grassB, 1);
    g.fillRect(0, b.p.y, f.viewW, a.y - b.p.y + 1);

    const fork = this.forkAt(z, f);
    const half = LANE_WIDTH / 2; // world units per projected half-lane width

    if (fork.d >= 0) {
      // Branches: one narrow road per path, grass between them.
      for (let i = 0; i < f.paths; i++) {
        const cA = branchCenter(fork.d, i, f.paths, LANE_WIDTH, f.branchLength, f.gapLength);
        const cB = branchCenter(Math.min(fork.d + f.segmentLength, forkLength), i, f.paths, LANE_WIDTH, f.branchLength, f.gapLength);
        const xa = a.x + (cA * a.w) / half;
        const xb = b.p.x + (cB * b.p.w) / half;
        this.quad(xa, a.y, a.w * 1.08, xb, b.p.y, b.p.w * 1.08, stripe ? COLORS.rumbleA : COLORS.rumbleB);
        this.quad(xa, a.y, a.w, xb, b.p.y, b.p.w, stripe ? COLORS.roadA : COLORS.roadB);
      }
      return;
    }

    const lanes = fork.fork >= 0 ? 1 + (f.paths - 1) * fork.widen : 1;
    const wA = a.w * lanes;
    const wB = b.p.w * lanes;
    this.quad(a.x, a.y, wA * 1.08, b.p.x, b.p.y, wB * 1.08, stripe ? COLORS.rumbleA : COLORS.rumbleB);
    this.quad(a.x, a.y, wA, b.p.x, b.p.y, wB, stripe ? COLORS.roadA : COLORS.roadB);

    // Lane dividers (dashed) while the road is wide.
    if (fork.fork >= 0 && fork.widen >= 1 && s % 4 < 2) {
      for (let i = 1; i < f.paths; i++) {
        const off = (i - f.paths / 2) * 2;
        const xa = a.x + off * a.w;
        const xb = b.p.x + off * b.p.w;
        this.quad(xa, a.y, Math.max(1, a.w * 0.03), xb, b.p.y, Math.max(1, b.p.w * 0.03), COLORS.lane);
      }
    }

    // Decision line: a dashed white band across the road.
    for (const dl of f.decisionLine) {
      if (dl >= z && dl < z + f.segmentLength) {
        const pieces = 12;
        for (let i = 0; i < pieces; i += 2) {
          const l = -wA + ((2 * wA) / pieces) * i;
          const r = l + (2 * wA) / pieces;
          g.fillStyle(COLORS.decision, 1);
          g.fillRect(a.x + l, b.p.y, r - l, Math.max(2, a.y - b.p.y));
        }
      }
    }

    // Finish line: checkered band.
    if (f.finishLine >= z && f.finishLine < z + f.segmentLength) {
      const cells = 10;
      for (let i = 0; i < cells; i++) {
        g.fillStyle(i % 2 ? COLORS.checkerA : COLORS.checkerB, 1);
        g.fillRect(a.x - wA + ((2 * wA) / cells) * i, b.p.y, (2 * wA) / cells, Math.max(3, a.y - b.p.y));
      }
    }
  }
}
