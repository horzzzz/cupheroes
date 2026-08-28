import { LEVEL_CAP, xpToNext } from '@/constants/economy';

/**
 * Pure XP -> player-level curve. Cumulative XP thresholds are built once at
 * import time (100 levels, cheap) rather than inverted analytically, since
 * `xpToNext` has no closed-form inverse worth maintaining.
 */
const CUMULATIVE: number[] = (() => {
  const table = [0];
  for (let level = 1; level < LEVEL_CAP; level += 1) {
    table.push(table[level - 1] + xpToNext(level));
  }
  return table;
})();

export type LevelInfo = {
  /** 1-based player level. */
  level: number;
  /** XP earned past the start of the current level. */
  into: number;
  /** XP needed to clear the current level -- 0 at the level cap. */
  needed: number;
  /** 0..1 progress toward the next level -- 1 (full bar) at the cap. */
  progress: number;
};

/** Derives the player's level + progress bar from total lifetime XP. */
export function levelFromXp(xp: number): LevelInfo {
  const clamped = Math.max(0, xp);

  let level = 1;
  while (level < LEVEL_CAP && clamped >= CUMULATIVE[level]) level += 1;

  const into = clamped - CUMULATIVE[level - 1];
  if (level >= LEVEL_CAP) return { level, into, needed: 0, progress: 1 };

  const needed = xpToNext(level);
  return { level, into, needed, progress: needed > 0 ? into / needed : 0 };
}
