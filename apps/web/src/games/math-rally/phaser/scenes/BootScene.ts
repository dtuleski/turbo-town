import Phaser from 'phaser';
import { validateRacePayload } from '../../bridge/protocol';
import type { HostToGame } from '../../bridge/protocol';
import { BUILTIN_TEXTURE_KEYS } from '../../core/engineConfig';
import { MR_CLIENT_PROTOCOL } from '../../core/shared';
import { CONTEXT_KEY } from '../context';
import type { RaceContext } from '../context';

/** G2: loads assets, checks the built-in textures, sends `ready`, waits for `init`. */
export class BootScene extends Phaser.Scene {
  private failed = false;

  constructor() {
    super('Boot');
  }

  private ctx(): RaceContext {
    return this.registry.get(CONTEXT_KEY) as RaceContext;
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      if (!this.failed) {
        this.failed = true;
        this.ctx().guard.report('ASSET_LOAD_FAILED');
      }
    });
    this.load.atlas('mr', 'atlas.png', 'atlas.json');
    for (const s of ['chime', 'buzz', 'beep', 'go']) this.load.audio(s, `sfx/${s}.wav`);
  }

  create(): void {
    const ctx = this.ctx();
    if (this.failed) return;
    if (!BUILTIN_TEXTURE_KEYS.every((k) => this.textures.exists(k)) || !this.textures.exists('mr')) {
      this.failed = true;
      ctx.guard.report('ASSET_LOAD_FAILED');
      return;
    }
    const off = ctx.channel.onMessage((m: HostToGame) => {
      if (m.type !== 'init') return;
      off();
      if (m.mode !== 'scored') {
        ctx.guard.report('INIT_INVALID');
        return;
      }
      const race = validateRacePayload(m.race, m.difficulty);
      if (!race) {
        ctx.guard.report('INIT_INVALID');
        return;
      }
      ctx.init = m;
      ctx.race = race;
      ctx.sound = m.sound;
      this.scene.start('Race');
      this.scene.launch('Hud');
    });
    ctx.channel.send({ v: 1, type: 'ready', protocolVersion: MR_CLIENT_PROTOCOL, buildId: ctx.buildId });
  }
}
