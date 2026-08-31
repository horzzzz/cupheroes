/**
 * One-shot sound effect registry. `require()` targets have to be spelled out
 * literally (Metro can't do a dynamic `require`) -- see `game/sprites.ts` for
 * the same constraint on images. Each id maps to a fixed-size voice pool: the
 * engine round-robins across those voices so, e.g., the hero's own volley
 * hitting two targets a beat apart doesn't cut its own sound off.
 */

export type SfxId = 'ui-click' | 'hero-attack' | 'enemy-melee' | 'enemy-ranged' | 'enemy-death' | 'victory' | 'defeat';

export const SFX_SOURCES: Record<SfxId, number> = {
  'ui-click': require('@/assets/audio/ui-click.m4a'),
  'hero-attack': require('@/assets/audio/hero-attack.m4a'),
  'enemy-melee': require('@/assets/audio/enemy-melee.m4a'),
  'enemy-ranged': require('@/assets/audio/enemy-ranged.m4a'),
  'enemy-death': require('@/assets/audio/enemy-death.m4a'),
  victory: require('@/assets/audio/victory.m4a'),
  defeat: require('@/assets/audio/defeat.m4a'),
};

/**
 * Voices per effect. `hero-attack` and `enemy-death` need more than one --
 * a volley can hit several targets a beat apart (`Timing.beatStagger`,
 * `combat.ts`) and a pack can drop several enemies in the same round -- so
 * the same clip needs to be able to overlap itself. Menu clicks and the
 * once-per-run jingles never overlap themselves, so 1-2 voices is enough.
 */
export const SFX_VOICES: Record<SfxId, number> = {
  'ui-click': 2,
  'hero-attack': 3,
  'enemy-melee': 2,
  'enemy-ranged': 2,
  'enemy-death': 3,
  victory: 1,
  defeat: 1,
};

export const WHEEL_SPIN_SOURCE: number = require('@/assets/audio/wheel-spin.m4a');
export const MUSIC_THEME_SOURCE: number = require('@/assets/audio/music-theme.m4a');
