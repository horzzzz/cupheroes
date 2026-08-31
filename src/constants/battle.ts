import { referenceAttackForLevel } from '@/constants/upgrades';

/**
 * Balance and layout constants for the auto-battle screen.
 *
 * Hero base stats mirror level 1 of the upgrade ladder (`UPGRADE_STEPS` in
 * `./upgrades.ts`: damage 10, health = damage x10, armor = damage x0.4) so
 * that hooking the ladder up later is a matter of reading the player's
 * current level, not re-deriving a battle-side balance curve.
 *
 * Every enemy/wave formula below is a *ratio* against the hero's own stats
 * (see `wavesEnemies`), not an absolute number, so the whole stat space
 * scales cleanly with `HeroBase` -- it briefly ran 10x these numbers
 * (100/1000/40) for rounding headroom, then got reverted per feedback that
 * the game should show human-sized numbers.
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
  /** Nominal round-to-round gap. Unused by the scheduler now -- the 'active'
   * phase's real gap is computed from the round's own beat count (see
   * `use-battle-scheduler`) -- kept as the reference pacing figure. */
  turnInterval: 3.3,
  /** Gap between the hero's beat(s) and the enemies' volley, and between one
   * round and the next -- wide enough that one attack's lunge-and-return
   * fully finishes and there's a clear beat of stillness before the next
   * actor goes, per feedback that attacks otherwise blurred into a
   * continuous flurry. */
  beatStagger: 1.05,
  /** Gap between one enemy's beat and the next *within* the same round's
   * enemy volley -- shorter than `beatStagger`, since a full wave's worth of
   * packs at the wave-15 growth curve would otherwise run to 20+ minutes of
   * combat (see the balance plan). The hero's own beat(s) still get the
   * full `beatStagger` before and after. */
  enemyVolleyStagger: 0.4,
  /** Lunge-and-return duration for an attack beat. */
  attackDuration: 0.55,
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
  /** How long a ball takes to drop to the ground from a dead enemy, before it rests and flies to the HUD. */
  ballFall: 0.35,
  /** How long a dropped ball sits on the ground before its flight to the HUD begins. */
  ballRest: 0.35,
  /** How long the wind-streak layer takes to ramp to full intensity once the hero starts moving. */
  windRamp: 0.3,
  /** Rise-and-fade duration for a death's smoke puff. */
  deathSmoke: 0.7,
  /** Rise-and-fade duration for the skull that flies out of a death's smoke. */
  deathSkull: 0.9,
  /** Flight duration for a ranged actor's projectile from muzzle to target -- `AttackBeat.travel`
   * for every ranged hit; 0 (instant) for melee. */
  projectileTravel: 0.32,
  /** Real-time pause after the hero's own death animation finishes before the defeat overlay appears. */
  defeatHold: 0.35,
} as const;

export type EnemyRange = 'melee' | 'ranged';

// The `ranged` archetype flies / stands off and looses projectiles; `melee`
// closes the distance and swings. A pack alternates them (see `WAVE_TABLE`);
// which creatures wear those roles is per-chapter art, resolved in `sprites.ts`.
export const BOSS_VISUAL_SCALE = 1.4;

/**
 * One enemy in a wave's composition table: its archetype and how many hits
 * from a *reference* hero (see `referenceAttackForLevel`) it takes to kill.
 * `wavesEnemies` turns this into real stats for the player's actual level.
 */
type PackEnemySpec = { range: EnemyRange; htk: number };

function melee(htk: number): PackEnemySpec {
  return { range: 'melee', htk };
}
function ranged(htk: number): PackEnemySpec {
  return { range: 'ranged', htk };
}

/**
 * Hand-authored composition for every wave's two packs (one for the boss
 * wave). A melee enemy spends its first `MELEE_APPROACH_TURNS` turns closing
 * the distance, so `M(n)` only gets `n - MELEE_APPROACH_TURNS` swings in
 * before it dies to a reference hero -- `M(3)` never lands a hit, which is
 * how wave 1 guarantees zero damage taken. Composition order matters: the
 * hero always targets the nearest living enemy (`nearestLiving` in
 * `combat.ts`), and melee enemies sit in the nearer slots (`assignPackSlots`
 * in this file), so listing melee first here reads the same "who dies
 * first" order the fight actually plays out in.
 *
 * See the balance plan for the full derivation of both this table and
 * `BITE` below -- they were tuned together against a simulation harness,
 * not picked independently.
 */
const WAVE_TABLE: Record<number, readonly (readonly PackEnemySpec[])[]> = {
  1: [[melee(3)], [melee(3)]],
  2: [[melee(5)], [ranged(3)]],
  3: [
    [melee(3), ranged(1)],
    [melee(3), ranged(1)],
  ],
  4: [
    [melee(4), ranged(1)],
    [melee(3), ranged(2)],
  ],
  5: [
    [melee(4), ranged(2)],
    [melee(4), ranged(2)],
  ],
  6: [
    [melee(3), ranged(1), ranged(1)],
    [melee(4), melee(3), ranged(1)],
  ],
  7: [
    [melee(3), ranged(2), ranged(1)],
    [melee(4), melee(3), ranged(2)],
  ],
  8: [
    [melee(4), ranged(2), ranged(1)],
    [melee(4), melee(3), ranged(2)],
  ],
  9: [
    [melee(4), ranged(2), ranged(2)],
    [melee(5), melee(3), ranged(2)],
  ],
  10: [
    [melee(4), ranged(2), ranged(2)],
    [melee(5), melee(3), ranged(2)],
  ],
  11: [
    [melee(4), ranged(3), ranged(2)],
    [melee(5), melee(3), ranged(2)],
  ],
  12: [
    [melee(5), ranged(3), ranged(2)],
    [melee(5), melee(4), ranged(2)],
  ],
  13: [
    [melee(5), ranged(3), ranged(2)],
    [melee(5), melee(4), ranged(3)],
  ],
  14: [
    [melee(5), ranged(3), ranged(3)],
    [melee(6), melee(4), ranged(3)],
  ],
  15: [[melee(14)]],
};

/**
 * Damage a wave's enemies deal, as a percentage of the reference hero's max
 * health per landed hit (index 0 = wave 1). Rises steadily wave over wave;
 * the boss's own multiplier (see `wavesEnemies`) sits on top of wave 14's
 * figure, not this array's last entry.
 */
const BITE: readonly number[] = [
  0, 4.7, 4.9, 5.1, 5.3, 5.54, 5.8, 6.06, 6.38, 6.68, 6.98, 7.32, 7.66, 8.04, 11.2,
];

/**
 * Balance snapshot from `npm run balance` (400 runs/scenario) after this
 * curve, `WAVE_TABLE` and the skill prices/values in `constants/skills.ts`
 * were tuned together against it, and after the level-1-100 stat rescale
 * was undone (`HeroBase` back to 100/10/4) and `runReward`
 * (`game/battle/rewards.ts`) stopped paying XP as a per-level-scaled,
 * per-wave sum -- see that function's doc comment for why the old version
 * let a level 1 character snowball to unplayable levels within a few dozen
 * runs, which is what actually caused "level 11 is impossible" reports even
 * though this curve is itself level-invariant by construction:
 *
 *   - wave 1: 0 damage taken, every run, every level (structural, not luck).
 *   - wave 2: melee lands its 1 hit, ranged lands both of its 2 -- exact.
 *   - no draft purchases at all: dies wave 6, every run.
 *   - a greedy draft (buys the cheapest affordable card every offer) at a
 *     reference-levelled hero: ~44-52% win rate at levels 5/10/20, ~61-64%
 *     at level 1 (small numbers round coarser at that scale, so a level-1
 *     run reads a little easier -- fine, reads as an easy first level, not
 *     as the level-dependent cliff the bug above caused). Most losses fall
 *     on wave 9-10.
 *   - a hero missing the top 6 ladder steps for their level: 0% win rate,
 *     dies wave 3 -- falling behind the ladder is punished hard.
 *   - ~7.5-8.7 minutes of combat at x1 speed (not counting pachinko/draft
 *     interludes) -- still longer than the plan's original 4-7 minute
 *     target; open for a follow-up pacing pass, not blocking this one.
 *   - not yet verified: no single skill should swing win rate by more than
 *     ~35 points on its own (the harness's draft AI doesn't isolate one
 *     skill at a time).
 */

/** How many attacks the boss (wave 15) makes per turn, instead of the usual one. */
export const BOSS_ATTACKS_PER_TURN = 2;
/** Flat armor the boss carries, as a fraction of the reference hero's attack. */
const BOSS_ARMOR_RATIO = 0.1;

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
  /** Drives the sprite (`ranged` vs `melee` art) as well as the approach behaviour. */
  range: EnemyRange;
  maxHealth: number;
  attack: number;
  armor: number;
  ballDrop: number;
  boss: boolean;
  visualScale: number;
  /** Attacks the enemy makes per turn, all landing (or missing) independently -- 1 for every enemy but the boss. */
  attacksPerTurn: number;
};

/** How much of the reference hero's own armor a landed hit needs to net out to, so `bite`% of max health actually goes through `mitigatedDamage`. */
const HERO_ARMOR_RATIO = HeroBase.armor / HeroBase.attack;

/**
 * Full enemy lineup for one pack: composition from `WAVE_TABLE`, stats
 * scaled off the *reference* hero at `level` (see `referenceAttackForLevel`)
 * -- not off the actual player's stats, so a player who kept pace with the
 * upgrade ladder meets the numbers this table was tuned for, and one who
 * fell behind meets something harder (the point of autolevelling by player
 * level, per the balance plan).
 */
export function wavesEnemies(wave: number, half: number, level: number): EnemySpec[] {
  const boss = wave === BOSS_WAVE;
  const packs = WAVE_TABLE[wave] ?? WAVE_TABLE[BOSS_WAVE];
  const pack = packs[Math.min(half, packs.length - 1)] ?? [];

  const referenceAttack = referenceAttackForLevel(level, HeroBase.attack);
  const bite = BITE[wave - 1] ?? BITE[BITE.length - 1];
  // mitigatedDamage subtracts the hero's own armor before the hit lands, so
  // the enemy's nominal attack has to overshoot `bite`% of hero health by
  // exactly that much for the *landed* damage to match the table.
  const attack = Math.round(referenceAttack * (bite / 10 + HERO_ARMOR_RATIO));

  return pack.map((enemy) => ({
    range: enemy.range,
    maxHealth: Math.round(referenceAttack * enemy.htk),
    attack,
    armor: boss ? Math.round(referenceAttack * BOSS_ARMOR_RATIO) : 0,
    // Two balls per enemy, always -- including the boss.
    ballDrop: 2,
    boss,
    visualScale: boss ? BOSS_VISUAL_SCALE : 1,
    attacksPerTurn: boss ? BOSS_ATTACKS_PER_TURN : 1,
  }));
}

/** Flat damage mitigation -- matches the hero's on-screen "defence" badge being a small flat number, not a percentage. */
export function mitigatedDamage(attack: number, armor: number): number {
  return Math.max(1, Math.round(attack - armor));
}
