import { useCallback, useEffect } from 'react';
import { runOnUI, useAnimatedReaction } from 'react-native-reanimated';

import { PLINKO_TUNING, type PlinkoLayout } from '@/constants/plinko';
import type { GameClock } from '@/game/clock';
import { stepPlinko } from '@/game/plinko/solver';
import { usePlinkoStore } from '@/game/plinko/store';
import { resetPlinkoWorld, type PlinkoWorld } from '@/game/plinko/world';

/**
 * Wires the pachinko world to the game clock: one UI-thread reaction turns
 * elapsed clock time into a fixed number of solver sub-steps, exactly the way
 * `useBattleScheduler` turns clock time into combat rounds. Pause freezes
 * `clock.time`, so the reaction simply stops firing; x2 doubles the elapsed
 * delta, so the accumulator hands out twice the sub-steps -- speed comes from
 * step count, never from stretching `dt`.
 *
 * A separate low-frequency poll copies the scalar counters into the zustand
 * store for the HUD; it never touches the arrays or the hot path.
 */
const MAX_ACC = PLINKO_TUNING.fixedDt * PLINKO_TUNING.maxSubsteps;

export function usePlinkoRunner(clock: GameClock, world: PlinkoWorld) {
  const beginDrop = usePlinkoStore((s) => s.beginDrop);
  const setPhase = usePlinkoStore((s) => s.setPhase);
  const syncCounts = usePlinkoStore((s) => s.syncCounts);
  const reset = usePlinkoStore((s) => s.reset);

  useAnimatedReaction(
    () => clock.time.value,
    (now, prev) => {
      'worklet';
      if (prev === null || world.running.value === 0) return;

      let acc = world.stepAcc.value + (now - prev);
      if (acc > MAX_ACC) acc = MAX_ACC; // drop the debt rather than spiral

      let steps = 0;
      while (acc >= PLINKO_TUNING.fixedDt && steps < PLINKO_TUNING.maxSubsteps) {
        stepPlinko(world, now);
        acc -= PLINKO_TUNING.fixedDt;
        steps += 1;
      }
      world.stepAcc.value = acc;

      if (world.spawnRemaining.value === 0 && world.liveCount.value === 0) {
        world.running.value = 0;
      }
    },
    [world],
  );

  // HUD sync -- 5 Hz, JS side, reads only scalar shared values.
  useEffect(() => {
    const id = setInterval(() => {
      // Before the pour starts the world counters are all zero, but the
      // interlude has parked the throw total in the store's `remaining` for
      // the top-cup display -- don't clobber it back to 0.
      const phase = usePlinkoStore.getState().phase;
      if (phase === 'idle') return;

      const collected = world.collected.value + world.overflow.value;
      const live = world.liveCount.value;
      const remaining = world.spawnRemaining.value;
      syncCounts(collected, live, remaining);
      if (world.running.value === 0 && phase === 'dropping') {
        setPhase('done');
      }
    }, 200);
    return () => clearInterval(id);
  }, [world, syncCounts, setPhase]);

  /** Seeds a fresh drop of `count` balls on `layout` and starts the solver. */
  const startDrop = useCallback(
    (count: number, layout: PlinkoLayout) => {
      beginDrop(count);
      // Install the board before anything steps -- the solver isn't running
      // yet (`running === 0`), so this races nothing.
      world.layout.value = layout;
      // Mark it running from JS right away so the HUD poll can't catch a
      // `running === 0 && phase === 'dropping'` window before the worklet
      // below lands and (wrongly) flip the phase straight to 'done'.
      world.running.value = 1;
      world.spawnRemaining.value = count;
      runOnUI(() => {
        'worklet';
        resetPlinkoWorld(world);
        world.spawnRemaining.value = count;
        world.running.value = 1;
        // Pre-charge the spawn accumulator so the first sub-step already emits
        // a ball -- `liveCount` is non-zero within the first frame, so the
        // solver's "queue empty and board clear" check can't end the drop
        // before it visibly starts.
        world.spawnAcc.value = PLINKO_TUNING.spawnInterval;
      })();
    },
    [world, beginDrop],
  );

  const stop = useCallback(() => {
    runOnUI(() => {
      'worklet';
      world.running.value = 0;
      resetPlinkoWorld(world);
    })();
    reset();
  }, [world, reset]);

  return { startDrop, stop };
}
