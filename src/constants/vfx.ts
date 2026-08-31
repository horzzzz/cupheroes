/**
 * Tuning for every procedural Skia VFX layer in the battle scene -- wind
 * streaks, death smoke/skull, and projectiles. Kept separate from
 * `battle.ts` (which stays the combat/layout source of truth) the same way
 * `plinko.ts` stays separate from `battle.ts` -- one file per visual system.
 * Timings that other systems key off (round duration, scheduler deadlines)
 * still live in `Timing` (`constants/battle.ts`); this file only holds
 * numbers private to how an effect looks.
 */

export const WindVfx = {
  poolSize: 16,
  /** Bottom N slots render larger and slower, as ground dust instead of air streaks. */
  dustSlots: 4,
  yRange: [250, 430] as const,
  streakLength: [22, 46] as const,
  dustSize: [10, 18] as const,
  /** Design-points/second a streak crosses the screen at, before the per-slot speed jitter. */
  baseSpeed: 260,
  maxOpacity: 0.35,
} as const;

export const DeathVfx = {
  smokeParticlesPerDeath: 6,
  smokeDeaths: 4,
  smokeStartRadius: 6,
  smokeGrowth: 2.2,
  smokeMaxOpacity: 0.8,
  smokeSpread: 30,
  smokeRise: 26,
  skullSlots: 4,
  /** Skull emerges this long after the smoke puff starts, not simultaneously with it. */
  skullDelay: 0.12,
  skullSize: 38,
  skullRise: 40,
  skullDrift: 10,
  skullSpinDeg: 50,
} as const;

export const ProjectileVfx = {
  poolSize: 8,
  heroArrowColor: '#B9BDC4',
  heroArrowEdgeColor: '#5B5F66',
  enemyBoltRadius: 6,
  enemyTrailSteps: 3,
  arcHeight: 14,
} as const;
