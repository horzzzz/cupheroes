import { victoryBonus, waveClearReward, xpToNext, type Reward } from '@/constants/economy';
import { addReward } from '@/game/economy/rewards';

/** Fraction of a level's worth of XP a defeated run still pays out. */
const DEFEAT_XP_FRACTION = 0.25;

/**
 * What a finished run pays out -- battle-specific, so it lives beside the
 * battle store rather than in `game/economy/`. Coins scale per wave cleared
 * (`wavesCompleted` already counts only fully-cleared waves, see
 * `battle/store.ts`, so a defeat mid wave 1 correctly pays no coins) plus a
 * bonus on victory, both via `waveClearReward`/`victoryBonus` in
 * `economy.ts`.
 *
 * XP is deliberately *not* part of that per-wave sum, or scaled by level the
 * same way coins are -- a run's XP payout is capped to a fixed fraction of
 * the player's *current* level (`xpToNext(level)`), full on a win, a quarter
 * on a loss, regardless of how many waves were actually cleared. Two
 * reasons: per design, a single win should read as "one level up", not the
 * 4-5 levels a summed-and-scaled reward could produce for a long clean run;
 * and structurally, an XP reward that scales with `level` the way coins do
 * feeds back into itself (bigger reward -> higher level next run -> bigger
 * reward again), which a live balance harness caught snowballing a level-1
 * character to unplayable levels of enemy scaling within a few dozen runs.
 * Tying it to `xpToNext(level)` instead makes runs-per-level roughly
 * constant by construction, whatever the player's actual level is.
 */
export function runReward(wavesCompleted: number, victory: boolean, level: number): Reward {
  let reward: Reward = {};
  const perWave = waveClearReward(level);
  for (let i = 0; i < wavesCompleted; i += 1) reward = addReward(reward, perWave);
  if (victory) reward = addReward(reward, victoryBonus(level));

  const xp = victory ? xpToNext(level) : Math.round(xpToNext(level) * DEFEAT_XP_FRACTION);
  return addReward(reward, { xp });
}
