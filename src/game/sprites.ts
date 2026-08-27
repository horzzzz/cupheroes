import { useImage, type SkImage } from '@shopify/react-native-skia';

/**
 * Character art was exported at 2x the Figma design box (see the project
 * memory on the shared spritesheet) -- every loaded image's natural pixel
 * size divided by this gives its size in design points.
 */
export const SPRITE_EXPORT_SCALE = 2;

const SOURCES = {
  heroIdle: require('@/assets/images/battle/hero-idle.webp'),
  heroRun: require('@/assets/images/battle/hero-run.webp'),
  heroAttack: require('@/assets/images/battle/hero-attack.webp'),
  enemy1Idle: require('@/assets/images/battle/enemy1-idle.webp'),
  enemy1Run: require('@/assets/images/battle/enemy1-run.webp'),
  enemy1Attack: require('@/assets/images/battle/enemy1-attack.webp'),
  enemy2Idle: require('@/assets/images/battle/enemy2-idle.webp'),
  enemy2Run: require('@/assets/images/battle/enemy2-run.webp'),
  enemy2Attack: require('@/assets/images/battle/enemy2-attack.webp'),
  bgTile: require('@/assets/images/battle/bg-location-tile.webp'),
  ball: require('@/assets/images/battle/icon-ball.webp'),
} as const;

export type SpriteName = keyof typeof SOURCES;
export type SpriteSet = Record<SpriteName, SkImage | null>;

export function useBattleSprites(): SpriteSet {
  /* eslint-disable react-hooks/rules-of-hooks -- fixed key set, not a loop over dynamic data */
  return {
    heroIdle: useImage(SOURCES.heroIdle),
    heroRun: useImage(SOURCES.heroRun),
    heroAttack: useImage(SOURCES.heroAttack),
    enemy1Idle: useImage(SOURCES.enemy1Idle),
    enemy1Run: useImage(SOURCES.enemy1Run),
    enemy1Attack: useImage(SOURCES.enemy1Attack),
    enemy2Idle: useImage(SOURCES.enemy2Idle),
    enemy2Run: useImage(SOURCES.enemy2Run),
    enemy2Attack: useImage(SOURCES.enemy2Attack),
    bgTile: useImage(SOURCES.bgTile),
    ball: useImage(SOURCES.ball),
  };
  /* eslint-enable react-hooks/rules-of-hooks */
}

export function isSpriteSetReady(sprites: SpriteSet): boolean {
  return Object.values(sprites).every((image) => image !== null);
}

export type ActorKey = 'hero' | 'enemy1' | 'enemy2';
export type PoseImages = { idle: SkImage | null; run: SkImage | null; attack: SkImage | null };

export function poseImages(sprites: SpriteSet, key: ActorKey): PoseImages {
  if (key === 'hero') return { idle: sprites.heroIdle, run: sprites.heroRun, attack: sprites.heroAttack };
  if (key === 'enemy1') return { idle: sprites.enemy1Idle, run: sprites.enemy1Run, attack: sprites.enemy1Attack };
  return { idle: sprites.enemy2Idle, run: sprites.enemy2Run, attack: sprites.enemy2Attack };
}

/** An image's size in design points, given the shared 2x export scale. */
export function spriteDesignSize(image: SkImage): { width: number; height: number } {
  return { width: image.width() / SPRITE_EXPORT_SCALE, height: image.height() / SPRITE_EXPORT_SCALE };
}
