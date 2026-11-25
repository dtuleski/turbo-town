import Phaser from 'phaser';
import { DEFAULT_JOYSTICK, JOYSTICK_IDLE, joystickStep, joystickVisible } from '../../core/joystick';
import type { JoystickState } from '../../core/joystick';
import { CONTEXT_KEY } from '../context';
import type { RaceContext } from '../context';
import { RACE_EVENTS, RACE_VIEW_KEY } from '../raceState';
import type { RaceView } from '../raceState';

const FONT = 'Arial, sans-serif';

/** G9: banner, fork count, coins, time, pause button and screen, countdown, lane chips, joystick. */
export class HudScene extends Phaser.Scene {
  private ctx!: RaceContext;
  private bar!: Phaser.GameObjects.Rectangle;
  private pauseBtn!: Phaser.GameObjects.Text;
  private forkText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private feedback!: Phaser.GameObjects.Text;
  private countdown!: Phaser.GameObjects.Text;
  private chips: Phaser.GameObjects.Text[] = [];
  private pauseScreen!: Phaser.GameObjects.Container;
  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private joy: JoystickState = { ...JOYSTICK_IDLE };
  private joyPointer: number | null = null;
  private joyDx: number | null = null;
  private touchSeen = false;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.ctx = this.registry.get(CONTEXT_KEY) as RaceContext;
    this.bar = this.add.rectangle(0, 0, 10, 10, 0x0f172a, 0.55).setOrigin(0, 0);
    this.pauseBtn = this.add
      .text(0, 0, 'II', { fontFamily: FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold', padding: { x: 14, y: 6 } })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.race()?.events.emit(RACE_EVENTS.togglePause);
      });
    const small = { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold' };
    this.forkText = this.add.text(0, 0, '', small);
    this.coinText = this.add.text(0, 0, '', small);
    this.timeText = this.add.text(0, 0, '', small);
    this.banner = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#0f172a',
        fontStyle: 'bold',
        backgroundColor: '#ffffffee',
        padding: { x: 18, y: 10 },
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.feedback = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '34px', color: '#ffffff', fontStyle: 'bold', stroke: '#0f172a', strokeThickness: 6 })
      .setOrigin(0.5);
    this.countdown = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '120px', color: '#ffffff', fontStyle: 'bold', stroke: '#0f172a', strokeThickness: 10 })
      .setOrigin(0.5);
    for (let i = 0; i < 4; i++) {
      this.chips.push(
        this.add
          .text(0, 0, '', { fontFamily: FONT, fontSize: '26px', color: '#0f172a', fontStyle: 'bold', backgroundColor: '#ffffff', padding: { x: 12, y: 6 } })
          .setOrigin(0.5)
      );
    }
    const shade = this.add.rectangle(0, 0, 10, 10, 0x0f172a, 1).setOrigin(0, 0);
    const pausedTitle = this.add.text(0, 0, 'Paused', { fontFamily: FONT, fontSize: '56px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const resume = this.add
      .text(0, 0, 'Resume', { fontFamily: FONT, fontSize: '34px', color: '#0f172a', backgroundColor: '#facc15', padding: { x: 24, y: 12 }, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.race()?.events.emit(RACE_EVENTS.togglePause));
    this.pauseScreen = this.add.container(0, 0, [shade, pausedTitle, resume]).setDepth(100).setVisible(false);
    this.pauseScreen.setData('parts', { shade, pausedTitle, resume });

    this.joyBase = this.add.circle(0, 0, 70, 0xffffff, 0.25).setStrokeStyle(4, 0xffffff, 0.7).setVisible(false);
    this.joyKnob = this.add.circle(0, 0, 32, 0xffffff, 0.85).setVisible(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.pointerMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.pointerUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.pointerUp(p));
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.layout());
  }

  private race(): Phaser.Scene | null {
    return this.scene.get('Race') ?? null;
  }

  private view(): RaceView | undefined {
    return this.registry.get(RACE_VIEW_KEY) as RaceView | undefined;
  }

  private layout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const u = Math.min(w, h) / 600;
    this.bar.setSize(w, 56 * u);
    this.pauseBtn.setPosition(8 * u, 4 * u).setScale(u);
    this.forkText.setPosition(90 * u, 14 * u).setScale(u);
    this.coinText.setPosition(w / 2 - 40 * u, 14 * u).setScale(u);
    this.timeText.setPosition(w - 130 * u, 14 * u).setScale(u);
    this.banner.setPosition(w / 2, 70 * u).setScale(u).setWordWrapWidth((w * 0.9) / u);
    this.feedback.setPosition(w / 2, h * 0.42).setScale(u);
    this.countdown.setPosition(w / 2, h * 0.4).setScale(u);
    const { shade, pausedTitle, resume } = this.pauseScreen.getData('parts');
    (shade as Phaser.GameObjects.Rectangle).setSize(w, h);
    (pausedTitle as Phaser.GameObjects.Text).setPosition(w / 2, h * 0.38).setScale(u);
    (resume as Phaser.GameObjects.Text).setPosition(w / 2, h * 0.55).setScale(u);
    this.joyBase.setPosition(w / 2, h - 90 * u).setScale(u);
    this.joyKnob.setPosition(w / 2, h - 90 * u).setScale(u);
  }

  private inJoystickZone(p: Phaser.Input.Pointer): boolean {
    return p.y > this.scale.height * 0.6;
  }

  private pointerDown(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) this.touchSeen = true;
    if (this.joyPointer !== null || !this.inJoystickZone(p)) return;
    if (!joystickVisible(Boolean(this.ctx.init?.touchUi), this.touchSeen)) return;
    this.joyPointer = p.id;
    this.joyDx = 0;
  }

  private pointerMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointer) return;
    const radius = 70 * (Math.min(this.scale.width, this.scale.height) / 600);
    this.joyDx = Math.max(-1.5, Math.min(1.5, (p.x - this.joyBase.x) / radius));
  }

  private pointerUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointer) return;
    this.joyPointer = null;
    this.joyDx = null;
  }

  update(time: number): void {
    try {
      this.step(time);
    } catch {
      this.ctx.guard.report();
    }
  }

  private setText(t: Phaser.GameObjects.Text, value: string): void {
    if (t.text !== value) t.setText(value);
  }

  private step(time: number): void {
    const v = this.view();
    if (!v) return;
    const paused = v.phase === 'paused';
    v.touchSeen = this.touchSeen;
    this.pauseScreen.setVisible(paused);
    this.setText(this.forkText, `${Math.min(v.fork + 1, v.forks)}/${v.forks}`);
    this.setText(this.coinText, `Coins ${v.coins}`);
    const s = Math.floor(v.timeMs / 100) / 10;
    this.setText(this.timeText, `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`);

    this.setText(this.countdown, v.phase === 'countdown' ? (v.countdown > 0 ? String(v.countdown) : 'Go!') : '');
    this.banner.setVisible(!paused && v.question !== null);
    if (v.question) this.setText(this.banner, v.question);

    const o = v.lastOutcome;
    const showOutcome = o !== null && v.timeMs < v.outcomeUntilMs && !paused;
    // Feedback never relies on colour alone: a symbol and a word (FR-MK accessibility).
    this.setText(this.feedback, showOutcome && o ? (o.correct ? '\u2713 Great!' : `\u2717 Almost! ${o.correctText}`) : '');
    this.feedback.setColor(o?.correct ? '#bbf7d0' : '#fecaca');

    const w = this.scale.width;
    const h = this.scale.height;
    const u = Math.min(w, h) / 600;
    const showChips = !paused && v.options.length > 0;
    for (let i = 0; i < this.chips.length; i++) {
      const chip = this.chips[i] as Phaser.GameObjects.Text;
      const visible = showChips && i < v.paths;
      chip.setVisible(visible);
      if (!visible) continue;
      const active = i === v.lane;
      this.setText(chip, active ? `\u25B2 ${v.options[i]}` : (v.options[i] as string));
      chip.setBackgroundColor(active ? '#facc15' : '#ffffff');
      const joystick = joystickVisible(Boolean(this.ctx.init?.touchUi), this.touchSeen);
      const chipY = joystick ? h - 180 * u - Math.min(w * 0.28, h * 0.3) * 0.75 - 30 * u : h * 0.62;
      chip.setPosition(w / 2 + (i - (v.paths - 1) / 2) * Math.min(150 * u, w / (v.paths + 0.5)), chipY).setScale(u);
    }

    const joyOn = joystickVisible(Boolean(this.ctx.init?.touchUi), this.touchSeen) && !paused && v.phase === 'running';
    this.joyBase.setVisible(joyOn);
    this.joyKnob.setVisible(joyOn);
    if (joyOn) {
      const r = this.joystickStepAt(time);
      this.joyKnob.x = this.joyBase.x + (this.joyDx ?? 0) * 40 * u;
      for (const a of r) this.race()?.events.emit(RACE_EVENTS.laneAction, a);
    }
  }

  private joystickStepAt(now: number): ('left' | 'right')[] {
    const r = joystickStep(this.joy, { dxRatio: this.joyDx, nowMs: now }, DEFAULT_JOYSTICK);
    this.joy = r.state;
    return r.actions;
  }
}
