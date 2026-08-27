/**
 * Balance and layout constants for the auto-battle screen.
 *
 * Hero base stats mirror level 1 of the upgrade ladder (`UPGRADE_STEPS` in
 * `./upgrades.ts`: damage 10, health = damage x10, armor = damage x0.4) so
 * that hooking the ladder up later is a matter of reading the player's
 * current level, not re-deriving a battle-side balance curve.
 */

export const WAVE_COUNT = 15;
export const BOSS_WAVE = 15;

/**
 * The battle screen's design-point frame (Figma node 1:1182: 390x844, same
 * as `DesignFrame` in `./theme.ts`) plus the split between the Skia canvas
 * up top (art + actors + HUD, 0-484) and the solid "journey in progress"
 * fill below it. Single source for every battle file that needs to size or
 * position against the frame -- every one of them multiplies these by the
 * device-derived `scale` from `useDesignScale()`, they never render at
 * these literal sizes.
 */
export const BattleFrame = {
  width: 390,
  height: 844,
  canvasHeight: 484,
} as const;

export const HeroBase = {
  maxHealth: 100,
  attack: 10,
  armor: 4,
} as const;

/** All durations are in game-clock seconds, so the x2 button speeds every one of them up for free. */
export const Timing = {
  /** Hero's run-in from off-screen at the start of the battle. */
  heroEnter: 0.9,
  /** Pause between the start of one round and the next -- 3x the original
   * pace, per playtest feedback that combat read as too frantic. */
  turnInterval: 3.3,
  /** Gap between beats within a round (hero's hit, then each enemy's in turn), same 3x. */
  beatStagger: 1.05,
  /** Lunge-and-return duration for an attack beat. */
  attackDuration: 0.8,
  /** How long a hit-flash/recoil lasts on the target. */
  hitFlash: 0.3,
  /** Fade-and-drop duration when an enemy dies. */
  deathFade: 0.5,
  /** Pop-in duration when a new wave's enemies spawn. */
  spawnIn: 0.35,
  /** Pause after the last enemy of a wave dies, before the next wave spawns. */
  waveAdvance: 1.2,
  /** Rise-and-fade duration for a floating damage number. */
  damageNumber: 0.7,
  /** Toss duration for a ball flying from a dead enemy to the HUD counter. */
  ballFlight: 0.55,
} as const;

export type SpriteKey = 'hero' | 'enemy1' | 'enemy2';

type EnemyArchetype = {
  spriteKey: Extract<SpriteKey, 'enemy1' | 'enemy2'>;
  baseHealth: number;
  baseAttack: number;
  baseArmor: number;
};

const ENEMY_ARCHETYPES: readonly EnemyArchetype[] = [
  { spriteKey: 'enemy1', baseHealth: 22, baseAttack: 3, baseArmor: 0 },
  { spriteKey: 'enemy2', baseHealth: 34, baseAttack: 5, baseArmor: 1 },
];

const WAVE_GROWTH = 1.12;
// The boss (wave 15) is a stand-in enlarged enemy2 -- no dedicated boss
// sprite exists yet, see the plan's assumptions.
const BOSS_HEALTH_MULT = 4.5;
const BOSS_ATTACK_MULT = 1.7;
export const BOSS_VISUAL_SCALE = 1.4;

/** How many enemies are on screen at once for a given (non-boss) wave -- ramps up to the 3-enemy cap. */
export function enemyCountForWave(wave: number): number {
  if (wave === BOSS_WAVE) return 1;
  if (wave <= 2) return 1;
  if (wave <= 6) return 2;
  return 3;
}

// Design-frame x per slot, keyed by how many enemies share the row (from the
// Figma battle screen, node 1:1182: two enemies sit at x=185/275; a third
// slot is spaced the same ~75-90px pitch, compressed slightly to stay near
// the 390pt frame).
const ENEMY_SLOT_X: Record<number, readonly number[]> = {
  1: [185],
  2: [185, 275],
  3: [155, 230, 305],
};

export const ENEMY_SLOT_Y = 324;
export const HERO_POS = { x: 25, y: 324 } as const;
export const HERO_OFFSCREEN_X = -110;

export function enemySlotPositions(count: number): readonly { x: number; y: number }[] {
  const xs = ENEMY_SLOT_X[count] ?? ENEMY_SLOT_X[3];
  return xs.map((x) => ({ x, y: ENEMY_SLOT_Y }));
}

export type EnemySpec = {
  spriteKey: Extract<SpriteKey, 'enemy1' | 'enemy2'>;
  maxHealth: number;
  attack: number;
  armor: number;
  ballDrop: number;
  boss: boolean;
  visualScale: number;
};

/** Full enemy lineup for a wave: composition, stats and ball drop, scaled by wave number. */
export function wavesEnemies(wave: number): EnemySpec[] {
  const count = enemyCountForWave(wave);
  const scale = WAVE_GROWTH ** (wave - 1);
  const boss = wave === BOSS_WAVE;

  return Array.from({ length: count }, (_, i) => {
    const archetype = ENEMY_ARCHETYPES[i % ENEMY_ARCHETYPES.length];
    return {
      spriteKey: archetype.spriteKey,
      maxHealth: Math.round(archetype.baseHealth * scale * (boss ? BOSS_HEALTH_MULT : 1)),
      attack: Math.round(archetype.baseAttack * scale * (boss ? BOSS_ATTACK_MULT : 1)),
      armor: Math.round(archetype.baseArmor * scale),
      ballDrop: 3 + Math.round(scale * 2) + (boss ? 25 : 0),
      boss,
      visualScale: boss ? BOSS_VISUAL_SCALE : 1,
    };
  });
}

/** Flat damage mitigation -- matches the hero's on-screen "defence" badge being a small flat number, not a percentage. */
export function mitigatedDamage(attack: number, armor: number): number {
  return Math.max(1, Math.round(attack - armor));
}
