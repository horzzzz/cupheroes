import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import { playSfx } from '@/game/audio/engine';
import type { GameClock } from '@/game/clock';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * Pachinko sound, scheduled off the game clock -- the same split
 * `use-battle-sfx.ts` uses, and for the same reason: the only time source is
 * `clock.time`, so pause and the x2 button apply to the audio for free.
 *
 * What it can't borrow from the battle hook is the timeline. Combat is solved
 * into `beats` before it animates, so there the hook walks a pre-sorted list.
 * The pachinko solver integrates frame by frame with its RNG advancing inside
 * the step (`use-plinko-runner.ts`), so no trajectory exists ahead of time.
 * Instead this reaction diffs the scalar counters the solver already writes.
 *
 * It also can't play a sound per collision. The board has no pegs -- every
 * obstacle is an oriented box, and the contact test is persistent rather than
 * edge-triggered, so a ball resting on the funnel reports a hit on all 180
 * sub-steps per second. With up to 320 live balls against 6-9 walls that is
 * thousands of contacts a second. So the rattle is *synthesised* instead:
 * short bursts of `plinko-tick` whose density, level and pitch spread track
 * how many balls are actually in play. Landings and gate triggers are real
 * events, but still rate-limited -- a draining board catches dozens a second.
 */

/** Clock seconds between rattle bursts. */
const RATTLE_INTERVAL = 0.09;
/** Live balls at which the rattle is at full density. */
const RATTLE_FULL = 90;
const RATTLE_MAX_VOICES = 3;

/** Minimum gap between catch ticks -- roughly a 10 Hz ceiling. */
const LAND_INTERVAL = 0.1;
const GATE_INTERVAL = 0.12;

export function usePlinkoSfx(clock: GameClock, world: PlinkoWorld) {
  const lastRattleAt = useSharedValue(0);
  const lastLandAt = useSharedValue(0);
  const lastGateAt = useSharedValue(0);
  const seenCollected = useSharedValue(0);
  const seenGateHits = useSharedValue(0);
  const seenAimLocked = useSharedValue(0);
  const seenBoostState = useSharedValue(0);

  useAnimatedReaction(
    () => clock.time.value,
    (now, prev) => {
      'worklet';
      if (prev === null) return;

      // The pour begins: the player let go and the cup opened.
      const aimLocked = world.aimLocked.value;
      if (aimLocked !== seenAimLocked.value) {
        if (aimLocked === 1 && seenAimLocked.value === 0) runOnJS(playSfx)('plinko-land');
        seenAimLocked.value = aimLocked;
      }

      // A fresh drop resets the world's counters -- follow them back down
      // rather than sitting on a stale high-water mark for the rest of the run.
      const collected = world.collected.value;
      if (collected < seenCollected.value) seenCollected.value = collected;
      const gateHits = world.gateHits.value;
      if (gateHits < seenGateHits.value) seenGateHits.value = gateHits;

      const live = world.liveCount.value;
      if (live > 0 && now - lastRattleAt.value >= RATTLE_INTERVAL) {
        lastRattleAt.value = now;
        const intensity = Math.min(1, live / RATTLE_FULL);
        const voices = 1 + Math.floor(intensity * (RATTLE_MAX_VOICES - 1));
        runOnJS(playRattle)(voices, intensity);
      }

      if (collected > seenCollected.value && now - lastLandAt.value >= LAND_INTERVAL) {
        const caught = collected - seenCollected.value;
        seenCollected.value = collected;
        lastLandAt.value = now;
        runOnJS(playLanding)(caught);
      }

      if (gateHits > seenGateHits.value && now - lastGateAt.value >= GATE_INTERVAL) {
        seenGateHits.value = gateHits;
        lastGateAt.value = now;
        runOnJS(playSfx)('plinko-gate');
      }

      // Boost pad arming -- the same stinger an octave down, so it reads as
      // related to the gates but distinct from them.
      const boostState = world.boostState.value;
      if (boostState !== seenBoostState.value) {
        if (boostState === 1 && seenBoostState.value === 0) {
          runOnJS(playSfx)('plinko-gate', { rate: 0.6 });
        }
        seenBoostState.value = boostState;
      }
    },
    [world],
  );
}

/**
 * One burst of the rattle. Looping on the JS side keeps this to a single
 * `runOnJS` hop per burst (~11/s) instead of one per voice, and the random
 * rate spread is what stops a repeated 0.2s sample from reading as a machine
 * gun rather than as many small objects hitting many surfaces.
 */
function playRattle(voices: number, intensity: number): void {
  for (let i = 0; i < voices; i++) {
    playSfx('plinko-tick', {
      gain: 0.12 + 0.28 * intensity,
      rate: 0.85 + Math.random() * 0.5,
    });
  }
}

/** `caught` balls hit the cup since the last tick -- one sound, louder for a bigger clump. */
function playLanding(caught: number): void {
  playSfx('plinko-land', { gain: Math.min(1, 0.45 + 0.12 * caught) });
}
