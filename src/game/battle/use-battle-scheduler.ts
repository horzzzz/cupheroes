import { useCallback, useEffect } from 'react';
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
        case 'enemies-in':
          store.finishEntering(gameTime);
          break;
        case 'active':
          store.advanceRound(gameTime);
          break;
        case 'clear':
          store.startAdvance(gameTime);
          break;
        case 'advancing':
          store.startNextPack(gameTime);
          break;
        case 'dying':
          store.finishDefeat();
          break;
        default:
          break; // victory / defeat: nothing to schedule until the player acts
      }

      const after = useBattleStore.getState();
      nextEventAt.value =
        after.phase === 'enemies-in'
          ? gameTime + Timing.enemyEnterDelay + Math.max(0, after.enemies.length - 1) * Timing.enemyEnterStagger + Timing.enemyEnter
          : after.phase === 'active'
            ? // The round the store just resolved reports exactly how long its
              // beats span (`resolveRound`'s `duration`, in `combat.ts`) -- hero
              // beats and enemy beats no longer share one fixed stagger, so the
              // next round's first beat starts precisely one round-duration after
              // this one instead of an approximation from the beat count. A short
              // gap here would cut an attack (or an enemy's approach step) off
              // mid-tween instead of letting it finish.
              gameTime + Math.max(Timing.beatStagger, after.round?.duration ?? Timing.beatStagger)
            : after.phase === 'clear'
              ? gameTime + Timing.packClear
              : after.phase === 'advancing'
                ? gameTime + Timing.packAdvance
                : after.phase === 'dying'
                  ? // Waits out the hero's own death animation (`deathFade`, same as
                    // an enemy's) plus a short real hold, timed off the killing
                    // blow's own impact -- not off `gameTime`, which is this
                    // round's *start*, earlier than the beat that actually killed
                    // the hero.
                    (after.heroDiedAt ?? gameTime) + Timing.deathFade + Timing.defeatHold
                  : Infinity;
    },
    [nextEventAt],
  );

  useAnimatedReaction(
    () => clock.time.value,
    (time) => {
      if (time >= nextEventAt.value) {
        // Lock the deadline out immediately, on the UI thread, before
        // `tick` even reaches the JS thread. `runOnJS` is a same-frame
        // dispatch, not a same-frame *call* -- without this, this reaction
        // keeps re-evaluating true (nextEventAt hasn't moved yet) on every
        // subsequent frame until `tick` actually runs and reschedules it,
        // firing several rounds back to back in one instant (multiple hero
        // shots, several enemy steps) instead of one.
        nextEventAt.value = Infinity;
        runOnJS(tick)(time);
      }
    },
  );

  // Re-arm the scheduler after a phase change the clock didn't drive -- the
  // pachinko/draft interlude releasing back into 'active' or 'clear' (the
  // player buying a skill card), or a revive. `nextEventAt = 0` fires the
  // reaction on the next frame; `tick`
  // then reschedules the real deadline from the phase it finds.
  useEffect(
    () =>
      useBattleStore.subscribe((s, prev) => {
        if (s.phase === prev.phase) return;
        const driven =
          s.phase === 'intro' ||
          s.phase === 'enemies-in' ||
          s.phase === 'active' ||
          s.phase === 'clear' ||
          s.phase === 'advancing' ||
          s.phase === 'dying';
        if (driven && nextEventAt.value === Infinity) nextEventAt.value = 0;
      }),
    [nextEventAt],
  );
}
