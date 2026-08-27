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
 * Per the Figma battle screen (node 1:1246/1:1182), one wave is fought as
 * two packs: the hero clears the first, advances, the second pack enters,
 * and only then does the wave counter/status bar move on. The boss wave is
 * a single pack -- there's nothing to split a lone boss fight into.
 */
export const HALVES_PER_WAVE = 2;

export function halvesInWave(wave: number): number {
  return wave === BOSS_WAVE ? 1 : HALVES_PER_WAVE;
}

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
  /** Enemies' run-in from off-screen right once a pack spawns. */
  enemyEnter: 1.1,
  /** Gap after the hero's own run-in (or a pack-advance) before enemies start entering. */
  enemyEnterDelay: 0.35,
  /** Stagger between one entering enemy's run-in and the next. */
  enemyEnterStagger: 0.18,
  /** Fallback re-arm pause for `useBattleScheduler`'s `wake()` (not currently wired to any UI) --
   * the 'active' phase's real round-to-round gap is computed from the round's own beat count instead,
   * see the scheduler. */
  turnInterval: 3.3,
  /** Gap between beats within a round (hero's hit, then each enemy's in turn)
   * -- wide enough that one attack's lunge-and-return fully finishes and
   * there's a clear beat of stillness before the next actor goes, per
   * feedback that attacks otherwise blurred into a continuous flurry. */
  beatStagger: 1.6,
  /** Lunge-and-return duration for an attack beat. */
  attackDuration: 0.8,
  /** A melee enemy's single approach step toward the hero. */
  moveStep: 0.8,
  /** How long a hit-flash/recoil lasts on the target. */
  hitFlash: 0.3,
  /** How long a health bar (and its number) takes to settle on a new value once the beat that changed
   * it actually starts -- not once the round resolves, which can be a couple of beats earlier. */
  healthTween: 0.25,
  /** Fade-and-drop duration when an enemy dies. */
  deathFade: 0.5,
  /** Pause after the last enemy of a pack dies, before the hero advances. */
  packClear: 1.2,
  /** Hero's walk-forward between one pack and the next within a wave. */
  packAdvance: 1.0,
  /** Rise-and-fade duration for a floating damage number. */
  damageNumber: 0.7,
  /** Toss duration for a ball flying from a dead enemy to the HUD counter. */
  ballFlight: 0.55,
} as const;

export type SpriteKey = 'hero' | 'enemy1' | 'enemy2';
export type EnemyRange = 'melee' | 'ranged';

type EnemyArchetype = {
  spriteKey: Extract<SpriteKey, 'enemy1' | 'enemy2'>;
  range: EnemyRange;
  baseHealth: number;
  baseAttack: number;
  baseArmor: number;
};

// enemy1 (bee) flies -- it's the ranged archetype; enemy2 (goblin) fights
// with a blade, up close. A pack alternates them (see `wavesEnemies`).
// Attack values deliberately low for now -- first-pass balance, tuned down
// again per playtest feedback that the hero was taking damage too fast;
// real numbers come later once the upgrade ladder is wired up.
const ENEMY_ARCHETYPES: readonly EnemyArchetype[] = [
  { spriteKey: 'enemy1', range: 'ranged', baseHealth: 22, baseAttack: 2, baseArmor: 0 },
  { spriteKey: 'enemy2', range: 'melee', baseHealth: 34, baseAttack: 3, baseArmor: 0 },
];

const WAVE_GROWTH = 1.09;
// The boss (wave 15) is a stand-in enlarged enemy2 -- no dedicated boss
// sprite exists yet, see the plan's assumptions.
const BOSS_HEALTH_MULT = 4.5;
const BOSS_ATTACK_MULT = 1.7;
export const BOSS_VISUAL_SCALE = 1.4;

/** How many enemies are in a pack for a given (non-boss) wave -- ramps up to the 3-enemy cap. */
export function enemyCountForWave(wave: number): number {
  if (wave === BOSS_WAVE) return 1;
  if (wave <= 5) return 2;
  return 3;
}

// Design-frame x per slot, keyed by how many enemies share the row. Both
// types enter and settle near the right edge, side by side -- a melee
// enemy's whole schtick is the long march *from* here *to* the hero over
// several turns, so its resting slot shouldn't already be halfway there.
// A character's idle box is ~90pt wide (the export's native 2x resolution),
// so slots need real daylight between them, not just non-overlapping
// centers -- adjacent boxes with zero gap read as touching/overlapping once
// the art's own bleed (wings, capes, blades) is on screen. The 3-slot row
// can't fit that gap in the room available (see `packVisualScale`), so it
// leans on a smaller render scale instead.
const ENEMY_SLOT_X: Record<number, readonly number[]> = {
  1: [275],
  2: [200, 300],
  3: [150, 235, 315],
};

export const ENEMY_SLOT_Y = 324;
export const HERO_POS = { x: 25, y: 324 } as const;
export const HERO_OFFSCREEN_X = -110;
/** Off-screen start x for entering enemies -- past the 390pt frame's right edge. */
export const ENEMY_ENTER_X = 420;

export function enemySlotPositions(count: number): readonly { x: number; y: number }[] {
  const xs = ENEMY_SLOT_X[count] ?? ENEMY_SLOT_X[3];
  return xs.map((x) => ({ x, y: ENEMY_SLOT_Y }));
}

/** Shrinks a crowded 3-enemy row so real gaps fit between the slots -- see `ENEMY_SLOT_X`. */
export function packVisualScale(count: number): number {
  return count >= 3 ? 0.82 : 1;
}

/**
 * Assigns each enemy in a pack (in composition order) a position slot --
 * melee enemies get the leftmost of the slots near the right edge (they're
 * the ones marching over to the hero, so they lead the pack), ranged
 * enemies get the rest (staying put nearer the edge they entered from,
 * to shoot from a distance). Stable within the same range, so composition
 * order still breaks ties.
 */
export function assignPackSlots(
  specs: readonly Pick<EnemySpec, 'range'>[],
): readonly { slotIndex: number; slotX: number }[] {
  const slots = enemySlotPositions(specs.length);
  const order = specs
    .map((spec, i) => ({ i, range: spec.range }))
    .sort((a, b) => {
      if (a.range === b.range) return a.i - b.i;
      return a.range === 'melee' ? -1 : 1;
    });

  const result = new Array<{ slotIndex: number; slotX: number }>(specs.length);
  order.forEach((entry, posIndex) => {
    result[entry.i] = { slotIndex: posIndex, slotX: slots[posIndex]?.x ?? 0 };
  });
  return result;
}

// Where a melee enemy ends up once it's closed in, keyed by its position
// slot index -- close enough to the hero (who occupies roughly x=25-115) to
// read as "in his face" without overlapping the sprite. In practice a pack
// has at most one melee enemy and it always lands in slot 0 (see
// `assignPackSlots`), so only the first entry is load-bearing.
const MELEE_TARGET_X: readonly number[] = [120, 150, 190];

/** A melee enemy spends exactly this many of its own turns closing the distance before it can attack --
 * a fixed count (not "however many turns it takes to close the gap"), so the player can read "one more
 * step and it's in range" the same way for every pack instead of it varying with how far it started. */
export const MELEE_APPROACH_TURNS = 3;

function meleeTargetX(slotIndex: number): number {
  return MELEE_TARGET_X[slotIndex] ?? MELEE_TARGET_X[MELEE_TARGET_X.length - 1];
}

/** Whether a melee enemy has taken all its approach steps and should attack instead of stepping closer. */
export function meleeHasArrived(steps: number): boolean {
  return steps >= MELEE_APPROACH_TURNS;
}

/** A melee enemy's on-screen x for how many approach steps it's taken so far (1..`MELEE_APPROACH_TURNS`) --
 * equal-sized steps from its resting `slotX` to `meleeTargetX`, so the last step always lands exactly on
 * the target regardless of how far the enemy started. A ranged enemy never calls this; it never moves. */
export function meleeStepX(slotX: number, slotIndex: number, steps: number): number {
  const target = meleeTargetX(slotIndex);
  const t = Math.min(1, steps / MELEE_APPROACH_TURNS);
  return slotX + (target - slotX) * t;
}

export type EnemySpec = {
  spriteKey: Extract<SpriteKey, 'enemy1' | 'enemy2'>;
  range: EnemyRange;
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
      range: archetype.range,
      maxHealth: Math.round(archetype.baseHealth * scale * (boss ? BOSS_HEALTH_MULT : 1)),
      attack: Math.round(archetype.baseAttack * scale * (boss ? BOSS_ATTACK_MULT : 1)),
      armor: Math.round(archetype.baseArmor * scale),
      // One ball per enemy, always -- including the boss.
      ballDrop: 1,
      boss,
      visualScale: boss ? BOSS_VISUAL_SCALE : 1,
    };
  });
}

/** Flat damage mitigation -- matches the hero's on-screen "defence" badge being a small flat number, not a percentage. */
export function mitigatedDamage(attack: number, armor: number): number {
  return Math.max(1, Math.round(attack - armor));
}
