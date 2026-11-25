import Phaser from 'phaser';
import type { HostToGame } from '../../bridge/protocol';
import { createRaceClock } from '../../core/clock';
import type { RaceClock } from '../../core/clock';
import { createForkController } from '../../core/forkController';
import type { ForkController } from '../../core/forkController';
import { moveLane } from '../../core/lanes';
import type { LaneState } from '../../core/lanes';
import { branchCenter, cameraDepth } from '../../core/projection';
import { optionText, promptText } from '../../core/promptText';
import { QUALITY, chooseProfile, loadStartProfile, rememberLowProfile } from '../../core/quality';
import type { QualityProfile } from '../../core/quality';
import { isCalm, segmentShape } from '../../core/roadShape';
import { protocolSpec } from '../../core/shared';
import type { MathRallyRacePayload, ProtocolSpec } from '../../core/shared';
import { createTrackRuntime } from '../../core/trackRuntime';
import type { TrackRuntime } from '../../core/trackRuntime';
import { CONTEXT_KEY } from '../context';
import type { FrameSample, RaceContext } from '../context';
import { RACE_EVENTS, RACE_VIEW_KEY, createRaceView } from '../raceState';
import type { RaceView } from '../raceState';
import { LANE_WIDTH, RoadRenderer } from '../render/roadRenderer';
import type { RoadFrame } from '../render/roadRenderer';

const COUNTDOWN_MS = 3000;
const FEEDBACK_MS = 1500;
const SIGN_AHEAD = 400;
const MAX_SAMPLES = 600;
const SPRITE_POOL = 140;
const SPRITE_EVERY = 5;
const SIDES = [-1, 1] as const;
const KINDS = ['tree', 'bush', 'post'] as const;

/** G3: the race. Motion and timing come from the track runtime (race clock), never from Phaser's delta. */
export class RaceScene extends Phaser.Scene {
  private ctx!: RaceContext;
  private race!: MathRallyRacePayload;
  private spec!: ProtocolSpec;
  private runtime!: TrackRuntime;
  private forks!: ForkController;
  private clock!: RaceClock;
  private view!: RaceView;
  private road!: RoadRenderer;
  private roadFrame!: RoadFrame;
  private lanes!: LaneState;
  private profile: QualityProfile = 'high';
  private kart!: Phaser.GameObjects.Image;
  private sprites: Phaser.GameObjects.Image[] = [];
  private signs: { box: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text }[] = [];
  private flame?: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private hills!: Phaser.GameObjects.Graphics;
  private countdownStart = -1;
  private lastBeep = 4;
  private kartX = 0;
  private lockedBranch = -1;
  private lastRaf = -1;
  private samples = new Float32Array(MAX_SAMPLES);
  private sampleCount = 0;
  private nextQualityCheck = 0;
  private curveAccum = 0;
  private pausedByHost = false;
  private offMessage: (() => void) | null = null;
  private onVisibility = () => {
    if (document.hidden) this.setPaused(true);
  };

  constructor() {
    super('Race');
  }

  create(): void {
    this.ctx = this.registry.get(CONTEXT_KEY) as RaceContext;
    this.race = this.ctx.race as MathRallyRacePayload;
    this.spec = protocolSpec(this.race.protocolVersion) as ProtocolSpec;
    this.runtime = createTrackRuntime(this.spec, this.race.difficulty);
    this.forks = createForkController(this.race);
    this.clock = createRaceClock();
    this.view = createRaceView(this.race.forks, this.race.paths);
    this.registry.set(RACE_VIEW_KEY, this.view);
    this.lanes = { count: this.race.paths, lane: Math.floor((this.race.paths - 1) / 2) };
    this.profile = loadStartProfile(this.ctx.storage);
    this.view.profile = this.profile;
    if (this.profile === 'low') this.ctx.setRenderScale?.(QUALITY.low.renderScale);

    this.drawBackground();
    const g = this.add.graphics().setDepth(0);
    this.road = new RoadRenderer(g, QUALITY.high.drawDistance, cameraDepth(100));
    const layout = this.runtime.layout();
    this.roadFrame = {
      position: 0,
      cameraX: 0,
      segmentLength: this.spec.track.segmentLength,
      drawDistance: QUALITY[this.profile].drawDistance,
      viewW: this.scale.width,
      viewH: this.scale.height,
      paths: this.race.paths,
      questionStart: layout.questionStart,
      decisionLine: layout.decisionLine,
      mergeEnd: layout.mergeEnd,
      finishLine: layout.finishLine,
      branchLength: this.spec.track.branchLength,
      gapLength: this.spec.track.gapLength,
    };

    for (let i = 0; i < SPRITE_POOL; i++) this.sprites.push(this.add.image(0, 0, 'mr', 'tree').setVisible(false).setOrigin(0.5, 1));
    for (let i = 0; i < 4; i++) {
      const board = this.add.image(0, 0, 'mr', 'sign').setOrigin(0.5, 1);
      const text = this.add
        .text(0, -38, '', { fontFamily: 'Arial, sans-serif', fontSize: '34px', color: '#1f2937', fontStyle: 'bold' })
        .setOrigin(0.5, 0.5);
      const mark = this.add.text(52, -58, '', { fontFamily: 'Arial, sans-serif', fontSize: '30px', color: '#16a34a', fontStyle: 'bold' }).setOrigin(0.5);
      const box = this.add.container(0, 0, [board, text, mark]).setVisible(false);
      this.signs.push({ box, text, mark });
    }
    this.kart = this.add.image(0, 0, 'mr', 'kart').setOrigin(0.5, 1).setDepth(5000);
    if (QUALITY[this.profile].particles) this.createParticles();

    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.laneAction('left'));
    kb?.on('keydown-A', () => this.laneAction('left'));
    kb?.on('keydown-RIGHT', () => this.laneAction('right'));
    kb?.on('keydown-D', () => this.laneAction('right'));
    kb?.on('keydown-P', () => this.setPaused(this.view.phase !== 'paused'));
    kb?.on('keydown-ESC', () => this.setPaused(this.view.phase !== 'paused'));
    if (this.ctx.devFaults) kb?.on('keydown-F8', () => this.fault());
    this.events.on(RACE_EVENTS.laneAction, (a: 'left' | 'right') => this.laneAction(a));
    this.events.on(RACE_EVENTS.togglePause, () => this.setPaused(this.view.phase !== 'paused'));
    this.events.on('mr-fault', () => this.fault());
    this.offMessage = this.ctx.channel.onMessage((m: HostToGame) => this.onHostMessage(m));
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offMessage?.();
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.drawBackground());
  }

  /** Dev and gate builds: throw inside a tween callback (AC-44.2). */
  private fault(): void {
    if (!this.ctx.devFaults) return;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 30,
      onUpdate: () => {
        throw new Error('Math Rally fault trigger');
      },
    });
  }

  private onHostMessage(m: HostToGame): void {
    if (m.type === 'pause') {
      this.pausedByHost = true;
      this.setPaused(true);
    } else if (m.type === 'resume') {
      this.pausedByHost = false;
      this.setPaused(false);
    } else if (m.type === 'setSound') {
      this.ctx.sound = m.sound;
    }
  }

  setPaused(paused: boolean): void {
    const v = this.view;
    if (v.phase === 'finished' || v.phase === 'countdown') return;
    if (paused === (v.phase === 'paused')) return;
    const now = this.game.loop.time;
    if (paused) {
      this.clock.pause(now);
      v.phase = 'paused';
      this.sound.pauseAll();
    } else {
      if (this.pausedByHost) return;
      this.clock.resume(now);
      v.phase = 'running';
      this.sound.resumeAll();
    }
    this.ctx.channel.send({ v: 1, type: 'pauseChanged', paused, sound: this.ctx.sound });
  }

  private laneAction(a: 'left' | 'right'): void {
    if (this.view.phase !== 'running' || this.lockedBranch >= 0) return;
    this.lanes = moveLane(this.lanes, a);
    this.view.lane = this.lanes.lane;
    // Lean at once, so the change is visible in the next frame (P-2).
    this.kart.setRotation(a === 'left' ? -0.14 : 0.14);
  }

  private play(key: string): void {
    if (this.ctx.sound) this.sound.play(key);
  }

  private createParticles(): void {
    this.flame = this.add.particles(0, 0, 'mr', {
      frame: 'flame',
      lifespan: 260,
      speedY: { min: 60, max: 120 },
      speedX: { min: -30, max: 30 },
      scale: { start: 0.7, end: 0 },
      frequency: 30,
      emitting: false,
    });
    this.flame.setDepth(4999);
    this.dust = this.add.particles(0, 0, 'mr', {
      frame: 'dust',
      lifespan: 380,
      speedY: { min: 20, max: 60 },
      speedX: { min: -80, max: 80 },
      scale: { start: 0.6, end: 0.1 },
      frequency: 45,
      emitting: false,
    });
    this.dust.setDepth(4999);
  }

  private drawBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.children.getByName('sky')?.destroy();
    const sky = this.add.graphics().setName('sky').setDepth(-10);
    const bands = [0x5fb8ff, 0x74c3ff, 0x8ccfff, 0xa6dbff, 0xc2e7ff];
    bands.forEach((c, i) => {
      sky.fillStyle(c, 1);
      sky.fillRect(0, (i * h) / 2 / bands.length, w, h / 2 / bands.length + 1);
    });
    this.hills?.destroy();
    this.hills = this.add.graphics().setDepth(-5);
    const layers = QUALITY[this.profile].parallaxLayers;
    const colours = [0x9bd88a, 0x86cc74, 0x72bf60];
    for (let l = 0; l < layers; l++) {
      this.hills.fillStyle(colours[l] as number, 1);
      for (let i = -2; i < 8; i++) {
        this.hills.fillEllipse(((i + l * 0.5) * w) / 4, h / 2 + 10 + l * 8, w / 2.5, h / 6 - l * 10);
      }
    }
  }

  update(time: number): void {
    try {
      this.step(time);
    } catch {
      this.ctx.guard.report();
    }
  }

  private step(time: number): void {
    const v = this.view;
    const raf = this.lastRaf < 0 ? 0 : time - this.lastRaf;
    this.lastRaf = time;

    if (v.phase === 'countdown') {
      if (this.countdownStart < 0) this.countdownStart = time;
      const left = Math.ceil((COUNTDOWN_MS - (time - this.countdownStart)) / 1000);
      if (left < this.lastBeep && left > 0) {
        this.lastBeep = left;
        this.play('beep');
        this.ctx.announce(String(left));
      }
      v.countdown = Math.max(left, 0);
      if (time - this.countdownStart >= COUNTDOWN_MS) {
        v.phase = 'running';
        this.clock.start(time);
        this.play('go');
        this.ctx.announce('Go!');
      }
      this.render(time);
      return;
    }
    if (v.phase !== 'running') {
      this.render(time);
      return;
    }

    const elapsed = this.clock.elapsedMs(time);
    v.timeMs = elapsed;
    let event: FrameSample['event'] = '';
    for (const e of this.runtime.frame(elapsed)) {
      if (e.type === 'questionStart') {
        const q = this.race.questions[e.fork];
        if (q) {
          v.question = promptText(q);
          v.options = q.options.map(optionText);
          v.fork = e.fork;
          this.ctx.announce(`Question ${e.fork + 1}: ${v.question}`);
        }
      } else if (e.type === 'decisionLine') {
        const outcome = this.forks.onDecisionLine(this.lanes.lane, e.atMs);
        this.runtime.applyOutcome(outcome.correct);
        this.lockedBranch = outcome.choice;
        const q = this.race.questions[outcome.fork];
        const correctText = q ? optionText(q.options[q.correctIndex] as string) : '';
        v.lastOutcome = { ...outcome, correctText };
        v.outcomeUntilMs = elapsed + FEEDBACK_MS;
        v.coins = this.forks.coins();
        v.question = null;
        this.play(outcome.correct ? 'chime' : 'buzz');
        this.ctx.announce(outcome.correct ? 'Correct!' : `Not quite. The answer is ${correctText}.`);
        event = 'decision';
      } else if (e.type === 'merge') {
        this.lockedBranch = -1;
        v.options = [];
        v.fork = Math.min(e.fork + 1, this.race.forks - 1);
        event = 'merge';
      } else if (e.type === 'finish') {
        v.phase = 'finished';
        const sub = this.forks.submission();
        this.ctx.channel.send({
          v: 1,
          type: 'raceFinished',
          choices: sub.choices,
          forkTimesMs: sub.forkTimesMs,
          raceTimeMs: Math.max(elapsed, sub.forkTimesMs[sub.forkTimesMs.length - 1] ?? 0),
          correctCount: this.forks.coins(),
        });
        this.ctx.announce(`Finish! ${this.forks.coins()} of ${this.race.forks} correct.`);
        event = 'finish';
      }
    }

    // Quality check once a second from "Go" (raw frame times, not Phaser's smoothed delta).
    if (raf > 0 && this.sampleCount < MAX_SAMPLES) this.samples[this.sampleCount++] = raf;
    if (this.profile === 'high' && elapsed >= this.nextQualityCheck) {
      this.nextQualityCheck = elapsed + 1000;
      const next = chooseProfile(this.profile, Array.from(this.samples.subarray(Math.max(0, this.sampleCount - 240), this.sampleCount)));
      if (next === 'low') {
        this.applyLow();
        event = event || 'profileLow';
      }
    }

    this.ctx.onFrame?.({ rafMs: time, clockMs: elapsed, profile: this.profile, fork: v.phase === 'finished' ? -1 : v.fork, event });
    this.render(time);
  }

  private applyLow(): void {
    this.profile = 'low';
    this.view.profile = 'low';
    this.roadFrame.drawDistance = QUALITY.low.drawDistance;
    this.flame?.stop();
    this.dust?.stop();
    this.ctx.setRenderScale?.(QUALITY.low.renderScale);
    rememberLowProfile(this.ctx.storage);
    this.drawBackground();
  }

  private render(time: number): void {
    const m = this.runtime.motion();
    const f = this.roadFrame;
    const t = this.spec.track;
    f.viewW = this.scale.width;
    f.viewH = this.scale.height;
    f.position = m.position;

    // Kart's lateral target: its lane while the road is wide, its branch inside a fork, the centre otherwise.
    const info = this.road.forkAt(m.position, f);
    let target = 0;
    if (info.fork >= 0 && info.d < 0) {
      target = (this.lanes.lane - (this.race.paths - 1) / 2) * LANE_WIDTH * info.widen;
    } else if (info.fork >= 0 && this.lockedBranch >= 0) {
      target = branchCenter(info.d, this.lockedBranch, this.race.paths, LANE_WIDTH, t.branchLength, t.gapLength);
    }
    const dt = Math.min(0.05, this.game.loop.delta / 1000);
    this.kartX += (target - this.kartX) * Math.min(1, dt * 12);
    f.cameraX = this.kartX;
    this.road.draw(f);

    // Parallax hills follow the road's curve.
    const shape = segmentShape(Math.floor(m.position / t.segmentLength), isCalm(m.position, f.decisionLine, t.branchLength + t.gapLength));
    this.curveAccum += shape.curve * dt * 4;
    this.hills.x = -(this.curveAccum % (f.viewW / 4));

    this.placeSprites();
    this.placeSigns();

    const w = f.viewW;
    const h = f.viewH;
    const kartScale = (w * 0.3) / 96;
    let bump = 0;
    const slowed = m.kinMs < m.slowUntilMs;
    const boosted = m.kinMs < m.boostUntilMs;
    if (slowed && !this.ctx.init?.reducedMotion) bump = Math.sin(time / 25) * 3 * kartScale;
    this.kart.setPosition(w / 2, h * 0.95 + bump).setScale(kartScale);
    this.kart.setRotation(this.kart.rotation * 0.85);
    if (this.flame) {
      this.flame.setPosition(w / 2, h * 0.95);
      if (boosted && !this.flame.emitting) this.flame.start();
      if (!boosted && this.flame.emitting) this.flame.stop();
    }
    if (this.dust) {
      this.dust.setPosition(w / 2, h * 0.95);
      if (slowed && !this.dust.emitting) this.dust.start();
      if (!slowed && this.dust.emitting) this.dust.stop();
    }
  }

  private placeSprites(): void {
    const f = this.roadFrame;
    const q = QUALITY[this.profile];
    const base = Math.floor(f.position / f.segmentLength);
    let used = 0;
    const cutoff = Math.floor(f.drawDistance * q.spriteCutoff);
    for (let n = f.drawDistance; n >= 1 && used < this.sprites.length; n--) {
      const s = base + n;
      if (s % (SPRITE_EVERY * q.spriteEvery) !== 0 || n > cutoff) continue;
      const seg = this.road.segments[n];
      if (!seg || !seg.visible) continue;
      for (const side of SIDES) {
        if (used >= this.sprites.length) break;
        const hash = Math.abs(Math.sin(s * 12.9898 + side * 78.233) * 43758.5453) % 1;
        const kind = KINDS[Math.floor(hash * 3)] as string;
        const roadHalf = (this.road.forkAt(seg.z, f).fork >= 0 ? f.paths * 1.9 : 1) * LANE_WIDTH * 0.5;
        const worldX = side * (roadHalf + 700 + hash * 2200);
        const pxPerUnit = seg.p.w / (LANE_WIDTH / 2);
        const img = this.sprites[used++] as Phaser.GameObjects.Image;
        const worldWidth = kind === 'tree' ? 1300 : kind === 'bush' ? 1000 : 220;
        const frameWidth = kind === 'tree' ? 64 : kind === 'bush' ? 64 : 16;
        img
          .setFrame(kind)
          .setPosition(seg.p.x + worldX * pxPerUnit, seg.p.y)
          .setScale((worldWidth * pxPerUnit) / frameWidth)
          .setDepth(1000 - n)
          .setVisible(true);
      }
    }
    for (let i = used; i < this.sprites.length; i++) (this.sprites[i] as Phaser.GameObjects.Image).setVisible(false);
  }

  private placeSigns(): void {
    const f = this.roadFrame;
    const t = this.spec.track;
    const v = this.view;
    const fork = v.fork;
    const decision = f.decisionLine[fork];
    const q = this.race.questions[fork];
    for (const s of this.signs) s.box.setVisible(false);
    if (decision === undefined || !q || v.phase === 'paused') return;
    const signZ = decision + SIGN_AHEAD;
    const n = Math.floor(signZ / f.segmentLength) - Math.floor(f.position / f.segmentLength);
    if (n < 1 || n > f.drawDistance) return;
    const seg = this.road.segments[n];
    if (!seg || !seg.visible) return;
    const pxPerUnit = seg.p.w / (LANE_WIDTH / 2);
    const decided = this.lockedBranch >= 0 && this.forks.current()?.fork !== fork;
    for (let i = 0; i < this.race.paths; i++) {
      const s = this.signs[i];
      if (!s) continue;
      const c = branchCenter(SIGN_AHEAD, i, this.race.paths, LANE_WIDTH, t.branchLength, t.gapLength);
      const text = optionText(q.options[i] as string);
      if (s.text.text !== text) s.text.setText(text);
      const mark = decided && i === q.correctIndex ? '\u2713' : '';
      if (s.mark.text !== mark) s.mark.setText(mark);
      s.box
        .setPosition(seg.p.x + c * pxPerUnit, seg.p.y)
        .setScale((LANE_WIDTH * 0.85 * pxPerUnit) / 128)
        .setDepth(1000 - n + 0.5)
        .setVisible(true);
    }
  }
}
