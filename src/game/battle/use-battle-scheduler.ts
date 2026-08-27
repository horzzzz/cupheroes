import { useCallback } from 'react';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import { Timing } from '@/constants/battle';
import type { GameClock } from '@/game/clock';
import { useBattleStore } from '@/game/battle/store';

/**
 * Drives the battle's phase machine off the game clock instead of a JS
 * timer, so pause and the x2 button apply to turn pacing automatically --
 * there's nothing separate to freeze or speed up.
 *
 * The store computes outcomes instantly (it's pure, synchronous JS); this
 * hook only decides *when* to call into it. One shared value holds the next
 * game-clock deadline; a UI-thread reaction fires into JS exactly when the
 * clock crosses it, and the JS side reschedules the next deadline based on
 * whatever phase the store landed in.
 */
export function useBattleScheduler(clock: GameClock) {
  const nextEventAt = useSharedValue<number>(Timing.heroEnter);

  const tick = useCallback(
    (gameTime: number) => {
      const store = useBattleStore.getState();
      switch (store.phase) {
        case 'intro':
          store.beginFirstWave(gameTime);
          break;
        case 'active':
          store.advanceRound(gameTime);
          break;
        case 'wave-clear':
          store.startNextWave(gameTime);
          break;
        default:
          break; // victory / defeat: nothing to schedule until the player acts
      }

      const after = useBattleStore.getState().phase;
      nextEventAt.value =
        after === 'active'
          ? gameTime + Timing.turnInterval
          : after === 'wave-clear'
            ? gameTime + Timing.waveAdvance
            : Infinity;
    },
    [nextEventAt],
  );

  useAnimatedReaction(
    () => clock.time.value,
    (time) => {
      if (time >= nextEventAt.value) {
        runOnJS(tick)(time);
      }
    },
  );

  /** Re-arms the scheduler after a phase change the clock didn't drive (e.g. tapping revive). */
  const wake = useCallback(
    (gameTime: number) => {
      nextEventAt.value = gameTime + Timing.turnInterval;
    },
    [nextEventAt],
  );

  return { wake };
}
