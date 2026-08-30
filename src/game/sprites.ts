import { useImage, type SkImage } from '@shopify/react-native-skia';

import { locationIndex } from '@/constants/chapters';

/**
 * Character art was exported at 2x the Figma design box (see the project
 * memory on the shared spritesheet) -- every loaded image's natural pixel
 * size divided by this gives its size in design points.
 */
export const SPRITE_EXPORT_SCALE = 2;

/** Chapter-independent art: the hero, and the ball icon that flies to the HUD. */
const HERO = {
  idle: require('@/assets/images/battle/hero-idle.webp'),
  run: require('@/assets/images/battle/hero-run.webp'),
  attack: require('@/assets/images/battle/hero-attack.webp'),
} as const;
const BALL = require('@/assets/images/battle/icon-ball.webp');

/**
 * One entry per location, in the cycle order of `CHAPTERS`. Each holds the
 * background tile and the two enemy archetypes' three poses. Metro can't do a
 * dynamic `require`, so every path is spelled out; `useBattleSprites` picks the
 * row for the run's chapter and only that row's images are ever decoded.
 *
 * `ranged` stands still and looses projectiles (c1 bee, c2 cowboy, c3 yeti,
 * c4 bat); `melee` closes the distance and swings (c1 goblin, c2 snake,
 * c3 penguin knight, c4 imp).
 */
const LOCATIONS = [
  {
    bgTile: require('@/assets/images/battle/bg-location-c1.webp'),
    rangedIdle: require('@/assets/images/battle/enemy-c1-ranged-idle.webp'),
    rangedRun: require('@/assets/images/battle/enemy-c1-ranged-run.webp'),
    rangedAttack: require('@/assets/images/battle/enemy-c1-ranged-attack.webp'),
    meleeIdle: require('@/assets/images/battle/enemy-c1-melee-idle.webp'),
    meleeRun: require('@/assets/images/battle/enemy-c1-melee-run.webp'),
    meleeAttack: require('@/assets/images/battle/enemy-c1-melee-attack.webp'),
  },
  {
    bgTile: require('@/assets/images/battle/bg-location-c2.webp'),
    rangedIdle: require('@/assets/images/battle/enemy-c2-ranged-idle.webp'),
    rangedRun: require('@/assets/images/battle/enemy-c2-ranged-run.webp'),
    rangedAttack: require('@/assets/images/battle/enemy-c2-ranged-attack.webp'),
    meleeIdle: require('@/assets/images/battle/enemy-c2-melee-idle.webp'),
    meleeRun: require('@/assets/images/battle/enemy-c2-melee-run.webp'),
    meleeAttack: require('@/assets/images/battle/enemy-c2-melee-attack.webp'),
  },
  {
    bgTile: require('@/assets/images/battle/bg-location-c3.webp'),
    rangedIdle: require('@/assets/images/battle/enemy-c3-ranged-idle.webp'),
    rangedRun: require('@/assets/images/battle/enemy-c3-ranged-run.webp'),
    rangedAttack: require('@/assets/images/battle/enemy-c3-ranged-attack.webp'),
    meleeIdle: require('@/assets/images/battle/enemy-c3-melee-idle.webp'),
    meleeRun: require('@/assets/images/battle/enemy-c3-melee-run.webp'),
    meleeAttack: require('@/assets/images/battle/enemy-c3-melee-attack.webp'),
  },
  {
    bgTile: require('@/assets/images/battle/bg-location-c4.webp'),
    rangedIdle: require('@/assets/images/battle/enemy-c4-ranged-idle.webp'),
    rangedRun: require('@/assets/images/battle/enemy-c4-ranged-run.webp'),
    rangedAttack: require('@/assets/images/battle/enemy-c4-ranged-attack.webp'),
    meleeIdle: require('@/assets/images/battle/enemy-c4-melee-idle.webp'),
    meleeRun: require('@/assets/images/battle/enemy-c4-melee-run.webp'),
    meleeAttack: require('@/assets/images/battle/enemy-c4-melee-attack.webp'),
  },
] as const;

export type SpriteName =
  | 'heroIdle'
  | 'heroRun'
  | 'heroAttack'
  | 'rangedIdle'
  | 'rangedRun'
  | 'rangedAttack'
  | 'meleeIdle'
  | 'meleeRun'
  | 'meleeAttack'
  | 'bgTile'
  | 'ball';
export type SpriteSet = Record<SpriteName, SkImage | null>;

/**
 * The set of decoded Skia images for one run. The number of `useImage` calls
 * is fixed (React rules of hooks) -- only the `source` passed to the
 * location-dependent ones changes with `chapter`, and Skia's `useImage`
 * re-decodes when its source changes.
 */
export function useBattleSprites(chapter: number): SpriteSet {
  const loc = LOCATIONS[locationIndex(chapter)];
  /* eslint-disable react-hooks/rules-of-hooks -- fixed key set, not a loop over dynamic data */
  return {
    heroIdle: useImage(HERO.idle),
    heroRun: useImage(HERO.run),
    heroAttack: useImage(HERO.attack),
    rangedIdle: useImage(loc.rangedIdle),
    rangedRun: useImage(loc.rangedRun),
    rangedAttack: useImage(loc.rangedAttack),
    meleeIdle: useImage(loc.meleeIdle),
    meleeRun: useImage(loc.meleeRun),
    meleeAttack: useImage(loc.meleeAttack),
    bgTile: useImage(loc.bgTile),
    ball: useImage(BALL),
  };
  /* eslint-enable react-hooks/rules-of-hooks */
}

export function isSpriteSetReady(sprites: SpriteSet): boolean {
  return Object.values(sprites).every((image) => image !== null);
}

/** Which enemy art an actor uses -- the two archetypes plus the hero. */
export type ActorKey = 'hero' | 'ranged' | 'melee';
export type PoseImages = { idle: SkImage | null; run: SkImage | null; attack: SkImage | null };

export function poseImages(sprites: SpriteSet, key: ActorKey): PoseImages {
  if (key === 'hero') return { idle: sprites.heroIdle, run: sprites.heroRun, attack: sprites.heroAttack };
  if (key === 'ranged') return { idle: sprites.rangedIdle, run: sprites.rangedRun, attack: sprites.rangedAttack };
  return { idle: sprites.meleeIdle, run: sprites.meleeRun, attack: sprites.meleeAttack };
}

/** An image's size in design points, given the shared 2x export scale. */
export function spriteDesignSize(image: SkImage): { width: number; height: number } {
  return { width: image.width() / SPRITE_EXPORT_SCALE, height: image.height() / SPRITE_EXPORT_SCALE };
}
