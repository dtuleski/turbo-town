/**
 * CSP-relevant part of the Phaser game config (G1). Pure: imports no Phaser, so it can be unit-tested
 * and evaluated before the engine loads. Literals confirmed against Phaser 4.2.1 (MR1 Step 1).
 */

export interface EngineOptions {
  /** '/games/math-rally/' on web, './' in the app bundle. */
  assetBaseUrl: string;
  /** ^[A-Za-z0-9._-]{1,40}$; web 'web', app 'app-' + first 12 hex of the source hash. */
  buildId: string;
  /** App bundle: ['dashden-game://']; merged into the loader's local schemes. */
  localSchemes?: readonly string[];
  /** Ignored unless compiled in dev or the gate mode. */
  devOverlay?: boolean;
}

export interface EngineConfigFields {
  images: { default: string; missing: string; white: string };
  loader: { imageLoadType: 'HTMLImageElement'; localScheme: string[] };
  banner: false;
}

/** Phaser 4.2.1 default `loader.localScheme` (src/core/Config.js). */
export const PHASER_DEFAULT_LOCAL_SCHEMES: readonly string[] = Object.freeze(['file://', 'capacitor://']);

/** Phaser 4.2.1 built-in textures (src/textures/TextureManager.js); BootScene checks them before `ready`. */
export const BUILTIN_TEXTURE_KEYS: readonly string[] = Object.freeze(['__DEFAULT', '__MISSING', '__WHITE', '__NORMAL']);

export const BUILD_ID_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;

export function engineConfigFields(options: EngineOptions): EngineConfigFields {
  const base = options.assetBaseUrl;
  const schemes: string[] = [];
  for (const s of [...PHASER_DEFAULT_LOCAL_SCHEMES, ...(options.localSchemes ?? [])]) {
    if (!schemes.includes(s)) schemes.push(s);
  }
  return {
    images: {
      default: `${base}sys/default.png`,
      missing: `${base}sys/missing.png`,
      white: `${base}sys/white.png`,
    },
    loader: { imageLoadType: 'HTMLImageElement', localScheme: schemes },
    banner: false,
  };
}
