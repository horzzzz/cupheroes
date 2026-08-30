/**
 * The economy's numbers -- coins, gems and XP -- all in one place, same
 * pattern as `constants/skills.ts` and `constants/upgrades.ts`. Everything
 * here is a first-pass placeholder: real balance comes once the loop is
 * fully wired and playtested.
 */

export type Reward = {
  coins?: number;
  gems?: number;
  xp?: number;
};

/**
 * Coins dropped per wave cleared, on top of the run's final bonus, at
 * player level 1. XP is *not* part of this reward -- a run's XP payout is
 * computed straight from `xpToNext` in `runReward` (`game/battle/rewards.ts`),
 * not summed per wave, so it can never be more than the fixed fraction of a
 * level the design calls for (see that function's doc comment for why).
 */
export const WAVE_CLEAR_REWARD: Reward = { coins: 4 };

/** One-time bonus for beating the boss (wave 15), at player level 1. Also XP-free, same reasoning as `WAVE_CLEAR_REWARD`. */
export const VICTORY_BONUS: Reward = { coins: 20, gems: 10 };

/**
 * Same compounding rate as the upgrade ladder's step cost (`GROWTH` in
 * `upgrades.ts`). Coin rewards scale with it so "runs needed to afford the
 * next ladder step" stays roughly constant as the player levels -- without
 * this, a flat reward falls further behind the ladder's price every level,
 * and the reference-hero autolevelling curve in `battle.ts` becomes
 * unreachable past the first few levels. Gems (a premium currency, and a
 * small flat amount to begin with) are deliberately left unscaled. XP
 * doesn't go through this at all any more -- see `WAVE_CLEAR_REWARD`.
 */
export const REWARD_GROWTH = 1.183;

function scaleReward(base: Reward, level: number): Reward {
  const mult = REWARD_GROWTH ** (level - 1);
  const scaled: Reward = {};
  if (base.coins !== undefined) scaled.coins = Math.round(base.coins * mult);
  if (base.gems !== undefined) scaled.gems = base.gems;
  return scaled;
}

/** `WAVE_CLEAR_REWARD` scaled for a player at `level`. */
export function waveClearReward(level: number): Reward {
  return scaleReward(WAVE_CLEAR_REWARD, level);
}

/** `VICTORY_BONUS` scaled for a player at `level`. */
export function victoryBonus(level: number): Reward {
  return scaleReward(VICTORY_BONUS, level);
}

/**
 * Player-level curve. `xpToNext(level)` is the XP needed to go from `level`
 * to `level + 1`; `level` is 1-based, curve starts at level 1.
 */
export const LEVEL_CAP = 100;
const XP_BASE = 100;
const XP_GROWTH = 1.15;

export function xpToNext(level: number): number {
  return Math.round(XP_BASE * XP_GROWTH ** (level - 1));
}

export const STARTING_BALANCE = { coins: 0, gems: 0, xp: 0 } as const;

/** Coin bundles bought with gems -- shop screen, node 1:144. */
export type CoinsPack = {
  amount: number;
  price: number;
  art: number;
};

export const COINS_PACKS: readonly CoinsPack[] = [
  { amount: 60, price: 18, art: require('@/assets/images/shop/card-coins-1.webp') },
  { amount: 181, price: 54, art: require('@/assets/images/shop/card-coins-2.webp') },
  { amount: 721, price: 216, art: require('@/assets/images/shop/card-coins-3.webp') },
];

/** Gem bundles -- real-money IAP, no store SDK yet (see TODO(iap) at the call site). */
export type GemPackItem = {
  amount: number;
  art: number;
  locked?: boolean;
};

export const GEM_PACKS: readonly GemPackItem[] = [
  { amount: 15, art: require('@/assets/images/shop/gem-pack-1.webp') },
  { amount: 20, art: require('@/assets/images/shop/gem-pack-2.webp') },
  { amount: 30, art: require('@/assets/images/shop/gem-pack-3.webp') },
  { amount: 45, art: require('@/assets/images/shop/gem-pack-4.webp'), locked: true },
];
