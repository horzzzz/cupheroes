/**
 * One-shot sound effect registry. `require()` targets have to be spelled out
 * literally (Metro can't do a dynamic `require`) -- see `game/sprites.ts` for
 * the same constraint on images.
 *
 * There are no voice pools any more: `engine.ts` decodes each clip once into
 * an `AudioBuffer` and spawns a throwaway source node per play, so a sound can
 * overlap itself as many times as the game asks for.
 */

export type SfxId =
  | 'ui-click'
  | 'ui-denied'
  | 'ui-purchase'
  | 'hero-attack'
  | 'enemy-melee'
  | 'enemy-ranged'
  | 'enemy-death'
  | 'victory'
  | 'defeat'
  | 'plinko-tick'
  | 'plinko-land'
  | 'plinko-gate'
  | 'draft-open';

export const SFX_SOURCES: Record<SfxId, number> = {
  'ui-click': require('@/assets/audio/ui-click.m4a'),
  'ui-denied': require('@/assets/audio/ui-denied.m4a'),
  'ui-purchase': require('@/assets/audio/ui-purchase.m4a'),
  'hero-attack': require('@/assets/audio/hero-attack.m4a'),
  'enemy-melee': require('@/assets/audio/enemy-melee.m4a'),
  'enemy-ranged': require('@/assets/audio/enemy-ranged.m4a'),
  'enemy-death': require('@/assets/audio/enemy-death.m4a'),
  victory: require('@/assets/audio/victory.m4a'),
  defeat: require('@/assets/audio/defeat.m4a'),
  'plinko-tick': require('@/assets/audio/plinko-tick.m4a'),
  'plinko-land': require('@/assets/audio/plinko-land.m4a'),
  'plinko-gate': require('@/assets/audio/plinko-gate.m4a'),
  'draft-open': require('@/assets/audio/draft-open.m4a'),
};

/**
 * Per-clip mix trim, applied by `playSfx` on top of the SOUND slider. Only
 * clips that need pulling down are listed; anything absent plays at 1.
 *
 * The source packs are mastered at wildly different levels -- these two are
 * the hottest one-shots in the set (`ui-purchase` peaks at -0.9 dBFS,
 * `draft-open` at -4.1) and jumped out of the mix against everything else.
 * Trimming here rather than re-encoding keeps the assets at full resolution,
 * so the balance stays adjustable without touching a file.
 *
 * A clip that's too *quiet* is the opposite case and doesn't belong here:
 * `ui-click` shipped at -44 dBFS and was re-encoded normalized instead, since
 * no amount of graph gain fixes a sample with no signal in it.
 */
export const SFX_GAIN: Partial<Record<SfxId, number>> = {
  'ui-purchase': 0.4,
  'draft-open': 0.6,
};

export const WHEEL_SPIN_SOURCE: number = require('@/assets/audio/wheel-spin.m4a');
export const MUSIC_THEME_SOURCE: number = require('@/assets/audio/music-theme.m4a');
