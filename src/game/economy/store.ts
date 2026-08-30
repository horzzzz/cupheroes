import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isStepBuyable, type UpgradeStep } from '@/constants/upgrades';
import type { Reward } from '@/constants/economy';

/**
 * The single persisted mother store for meta-progression currencies: coins,
 * gems, XP, which upgrade-ladder steps are owned, and the free wheel spin's
 * cooldown. One store means one hydration point and one atomic write --
 * `game/daily/store.ts` keeps its own separate persisted key (streak-only,
 * already shipped) and just calls `grant` here instead of holding its own
 * coin balance.
 */
type EconomyState = {
  coins: number;
  gems: number;
  xp: number;
  /** Owned upgrade-ladder step ids, e.g. "3-attack" (see `UpgradeStep.id`). */
  ownedUpgrades: Record<string, true>;
  /** Epoch ms of the last free wheel spin, or null if never spun. */
  lastFreeSpinAt: number | null;
  /** True once the persisted value has been read back from disk. */
  hydrated: boolean;

  /** Adds a reward's fields to the balance. Missing fields are no-ops. */
  grant: (reward: Reward) => void;
  /** Atomically spends a reward-shaped cost. Returns false (no-op) if any field can't be covered. */
  spend: (cost: Reward) => boolean;
  /** Spends `step.cost` coins and marks it owned, as one transaction. False if unaffordable or already owned. */
  buyUpgrade: (step: UpgradeStep) => boolean;
  /** Records a free spin at `now`, driving the wheel screen's cooldown. */
  startFreeSpin: (now: number) => void;
};

const initialState = {
  coins: 0,
  gems: 0,
  xp: 0,
  ownedUpgrades: {} as Record<string, true>,
  lastFreeSpinAt: null as number | null,
  hydrated: false,
};

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      ...initialState,

      grant: (reward) => {
        const state = get();
        set({
          coins: state.coins + (reward.coins ?? 0),
          gems: state.gems + (reward.gems ?? 0),
          xp: state.xp + (reward.xp ?? 0),
        });
      },

      spend: (cost) => {
        const state = get();
        const okCoins = (cost.coins ?? 0) <= state.coins;
        const okGems = (cost.gems ?? 0) <= state.gems;
        const okXp = (cost.xp ?? 0) <= state.xp;
        if (!okCoins || !okGems || !okXp) return false;

        set({
          coins: state.coins - (cost.coins ?? 0),
          gems: state.gems - (cost.gems ?? 0),
          xp: state.xp - (cost.xp ?? 0),
        });
        return true;
      },

      buyUpgrade: (step) => {
        const state = get();
        // The ladder is sequential -- attack, then health, then defence,
        // level by level (see `isStepBuyable`) -- so the hero's stats stay
        // proportional to `HeroBase` the way the wave-scaling curve assumes.
        if (!isStepBuyable(step, state.ownedUpgrades)) return false;
        if (!get().spend({ coins: step.cost })) return false;
        set({ ownedUpgrades: { ...get().ownedUpgrades, [step.id]: true } });
        return true;
      },

      startFreeSpin: (now) => set({ lastFreeSpinAt: now }),
    }),
    {
      name: 'cup-economy-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ coins, gems, xp, ownedUpgrades, lastFreeSpinAt }) => ({
        coins,
        gems,
        xp,
        ownedUpgrades,
        lastFreeSpinAt,
      }),
    },
  ),
);

useEconomyStore.persist.onFinishHydration(() => useEconomyStore.setState({ hydrated: true }));
// Covers the case where hydration already finished before the listener above
// was attached (synchronous storage / fast resolve) -- same guard as the
// daily store.
if (useEconomyStore.persist.hasHydrated()) useEconomyStore.setState({ hydrated: true });
