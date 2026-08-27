import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * The single time source for a battle: every animation (sprite motion, health
 * bars, damage numbers, the future pachinko solver) is a pure function of
 * `time` and reads nothing else. That's what makes the x2 button and pause
 * apply uniformly for free -- there's no per-animation duration to rescale or
 * freeze, just one number that stops or advances faster.
 */
export type GameClock = {
  /** Seconds elapsed, scaled by `timeScale`. Frozen while `paused` is true. */
  time: SharedValue<number>;
  timeScale: SharedValue<number>;
  paused: SharedValue<boolean>;
};

// Clamps a single frame's delta so a stall (tab switch, GC pause, slow
// device) can't be replayed as one huge time jump -- the battle would
// otherwise appear to skip several turns at once when the app resumes.
const MAX_FRAME_DELTA_MS = 100;

export function useGameClock(): GameClock {
  const time = useSharedValue(0);
  const timeScale = useSharedValue(1);
  const paused = useSharedValue(false);

  useFrameCallback((frameInfo) => {
    'worklet';
    if (paused.value) return;
    const deltaMs = Math.min(frameInfo.timeSincePreviousFrame ?? 0, MAX_FRAME_DELTA_MS);
    time.value += (deltaMs / 1000) * timeScale.value;
  });

  return { time, timeScale, paused };
}
