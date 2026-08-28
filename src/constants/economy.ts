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

/** Coins + XP dropped per wave cleared, on top of the run's final bonus. */
export const WAVE_CLEAR_REWARD: Reward = { coins: 25, xp: 20 };

/** One-time bonus for beating the boss (wave 15). */
export const VICTORY_BONUS: Reward = { coins: 150, xp: 100, gems: 2 };

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

/** Free wheel spin cooldown -- matches the wheel screen's old local constant. */
export const FREE_SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
