import { useCallback, useEffect, useRef, useState } from 'react';
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import { PLINKO_AIM_RANGE } from '@/constants/plinko';
import type { GameClock } from '@/game/clock';
import { useBattleStore } from '@/game/battle/store';
import { usePlinkoRunner } from '@/game/plinko/use-plinko-runner';
import { usePlinkoStore } from '@/game/plinko/store';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * Owns the battle <-> pachinko camera and drives the whole interlude off the
 * battle store's `plinko` phase, so `battle.tsx` only has to mount this hook,
 * bind the returned `cameraY` to its deck stack, and hand `releaseThrow` to
 * the board.
 *
 * Flow: battle phase becomes `plinko` (a fresh wave's first pack has run in)
 * -> pan the camera down one deck height. The balls the player earned this
 * run sit in the top cup and do NOT pour on their own -- the player presses,
 * drags the cup to aim, and on releasing the finger (`releaseThrow`) the
 * pour begins and the cup freezes (`world.aimLocked`) for the rest of this
 * drop. The screen simply waits for that gesture. The HUD ball counter
 * tracks the balls still in play as they settle. When the board clears, pan
 * back up, and only once the pan finishes hand control back to combat.
 *
 * `PAN_MS` is a real-time UI transition, deliberately not a game-clock value:
 * it must run at a fixed wall-clock rate regardless of the x2 button.
 */
const PAN_MS = 850;

export function usePlinkoInterlude(clock: GameClock, world: PlinkoWorld, deckHeight: number) {
  const { startDrop, stop } = usePlinkoRunner(clock, world);
  const battlePhase = useBattleStore((s) => s.phase);
  const plinkoPhase = usePlinkoStore((s) => s.phase);
  const cameraY = useSharedValue(0);

  const [awaitingThrow, setAwaitingThrow] = useState(false);
  const earnedRef = useRef(0);
  const thrownRef = useRef(false);
  const wasPlinkoRef = useRef(false);

  const releaseThrow = useCallback(() => {
    if (thrownRef.current) return;
    thrownRef.current = true;
    setAwaitingThrow(false);
    startDrop(earnedRef.current);
  }, [startDrop]);

  const resumeAndStop = useCallback(() => {
    stop(); // resets the pachinko world + its store
    useBattleStore.setState({ balls: 0 });
    useBattleStore.getState().resumeFromPlinko();
  }, [stop]);

  // Enter: pan down, arm the throw. The drop waits for `releaseThrow`.
  useEffect(() => {
    if (battlePhase !== 'plinko') return;
    earnedRef.current = useBattleStore.getState().balls;
    thrownRef.current = false;
    setAwaitingThrow(true);
    world.aimLocked.value = 0; // cup movable again for this wave's aim
    world.aimX.value = (PLINKO_AIM_RANGE.min + PLINKO_AIM_RANGE.max) / 2; // start centred
    // Show the waiting count in the top cup before the pour starts.
    usePlinkoStore.setState({ remaining: earnedRef.current });
    cameraY.value = withTiming(deckHeight, { duration: PAN_MS, easing: Easing.inOut(Easing.cubic) });
  }, [battlePhase, deckHeight, cameraY, world]);

  // While the balls are dropping, the HUD counter shows how many are still
  // unsettled (queued + live), draining to 0. Before the drop it stays at the
  // earned total.
  useEffect(() => {
    if (battlePhase !== 'plinko') return;
    return usePlinkoStore.subscribe((s) => {
      if (s.phase !== 'dropping' && s.phase !== 'done') return;
      useBattleStore.setState({ balls: s.remaining + s.live });
    });
  }, [battlePhase]);

  // Board clear: pan back up, then release combat once the pan lands.
  useEffect(() => {
    if (battlePhase !== 'plinko' || plinkoPhase !== 'done') return;
    cameraY.value = withTiming(0, { duration: PAN_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      'worklet';
      if (finished) runOnJS(resumeAndStop)();
    });
  }, [battlePhase, plinkoPhase, cameraY, resumeAndStop]);

  // Leaving the interlude for any reason other than the normal finish (a retry
  // from the pause modal resets the run to 'intro'): snap the camera home and
  // clear the board. Guarded so it doesn't churn a no-op withTiming on every
  // ordinary combat phase change.
  useEffect(() => {
    if (battlePhase === 'plinko') {
      wasPlinkoRef.current = true;
      return;
    }
    if (!wasPlinkoRef.current) return;
    wasPlinkoRef.current = false;
    setAwaitingThrow(false);
    cameraY.value = withTiming(0, { duration: PAN_MS });
    if (usePlinkoStore.getState().phase !== 'idle') stop();
  }, [battlePhase, stop, cameraY]);

  return { cameraY, releaseThrow, awaitingThrow };
}
