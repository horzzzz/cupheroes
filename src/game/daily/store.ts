import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addDays, rewardForDay } from '@/game/daily/rewards';
import { useEconomyStore } from '@/game/economy/store';

/**
 * Persisted daily-bonus streak (Figma nodes 1:781 / 1:958).
 *
 * Only two things need to survive a restart: the local date of the last
 * claim and how far into the streak the player has reached. Everything the
 * popup shows (which day is next, whether today is already claimed, the
 * countdown) is derived from those via `getDailyStatus` against "today".
 */
type DailyState = {
  /** Local `YYYY-MM-DD` of the last claim, or null if never claimed. */
  lastClaimDate: string | null;
  /** Highest 1-based day claimed in the current streak (0 = nothing yet). */
  claimedDay: number;
  /** True once the persisted value has been read back from disk. */
  hydrated: boolean;

  /** Records a claim for `today` (local date key). No-op if already claimed today. */
  claim: (today: string) => void;
};

export type DailyStatus =
  | { phase: 'claimed'; currentDay: number }
  | { phase: 'ready'; nextDay: number };

/** Derives what the popup should show for `today` (a `localDateKey`). */
export function getDailyStatus(
  state: Pick<DailyState, 'lastClaimDate' | 'claimedDay'>,
  today: string,
): DailyStatus {
  const { lastClaimDate, claimedDay } = state;
  if (lastClaimDate === today) return { phase: 'claimed', currentDay: claimedDay };
  if (lastClaimDate === addDays(today, -1)) return { phase: 'ready', nextDay: claimedDay + 1 };
  // First ever open, or a calendar day was missed -> streak restarts at day 1.
  return { phase: 'ready', nextDay: 1 };
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      lastClaimDate: null,
      claimedDay: 0,
      hydrated: false,

      claim: (today) => {
        const status = getDailyStatus(get(), today);
        if (status.phase !== 'ready') return;
        useEconomyStore.getState().grant({ coins: rewardForDay(status.nextDay) });
        set({ lastClaimDate: today, claimedDay: status.nextDay });
      },
    }),
    {
      name: 'cup-daily-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lastClaimDate, claimedDay }) => ({ lastClaimDate, claimedDay }),
    },
  ),
);

useDailyStore.persist.onFinishHydration(() => useDailyStore.setState({ hydrated: true }));
// Covers the case where hydration already finished before the listener above
// was attached (synchronous storage / fast resolve).
if (useDailyStore.persist.hasHydrated()) useDailyStore.setState({ hydrated: true });
