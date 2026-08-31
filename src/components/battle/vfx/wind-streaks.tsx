import { Atlas, Group, Skia, useRSXformBuffer, type SkRect } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { BattleFrame, Timing } from '@/constants/battle';
import { WindVfx } from '@/constants/vfx';
import { useStreakTexture } from '@/game/battle/vfx-textures';
import type { GameClock } from '@/game/clock';
import { clamp01 } from '@/game/easing';

/**
 * Speed lines (and a few slower ground-dust motes) that sweep right to left
 * across the scene while the hero is moving forward -- during its initial
 * run-in, and again during the `advancing` walk between packs. One `<Atlas>`
 * draw call for the whole pool; per-slot motion is a pure function of
 * `clock.time` (each slot cycles continuously, whether visible or not), so
 * the only thing that varies with game state is one overall opacity value
 * wrapping the atlas -- pause and x2 apply for free, same as every other
 * battle layer.
 */

const VIEWPORT_WIDTH = BattleFrame.width;

type StreakParams = { y: number; length: number; speed: number; phase: number; dust: boolean };

function makeParams(): StreakParams[] {
  const total = WindVfx.poolSize;
  return Array.from({ length: total }, (_, i) => {
    const dust = i >= total - WindVfx.dustSlots;
    const [yMin, yMax] = WindVfx.yRange;
    const [lenMin, lenMax] = dust ? WindVfx.dustSize : WindVfx.streakLength;
    return {
      // Dust motes hug the bottom of the range (ground level), air streaks spread across the rest.
      y: dust ? yMax - Math.random() * (yMax - yMin) * 0.15 : yMin + Math.random() * (yMax - yMin) * 0.85,
      length: lenMin + Math.random() * (lenMax - lenMin),
      speed: WindVfx.baseSpeed * (dust ? 0.32 : 0.85 + Math.random() * 0.3),
      phase: Math.random() * (VIEWPORT_WIDTH * 2),
      dust,
    };
  });
}

type WindStreaksProps = {
  clock: GameClock;
  scale: number;
  /** True while the hero is walking forward between packs (`phase === 'advancing'`). */
  walking: boolean;
};

export function WindStreaks({ clock, scale, walking }: WindStreaksProps) {
  const params = useMemo(makeParams, []);
  const texture = useStreakTexture(WindVfx.streakLength[1], scale);

  // Captures the game-clock moment `walking` last turned on, so the
  // 'advancing' activation window (below) ramps from its own start instead
  // of from t=0 -- the hero's initial run-in already starts at t=0 for free.
  // Adjusts state during render (React's documented pattern for deriving
  // state from a prop change) rather than an effect, so the very first frame
  // `walking` is true already has the right start time -- no one-render lag.
  const [prevWalking, setPrevWalking] = useState(walking);
  const [walkStartAt, setWalkStartAt] = useState(0);
  if (walking !== prevWalking) {
    setPrevWalking(walking);
    setWalkStartAt(walking ? clock.time.value : 0);
  }

  const intensity = useDerivedValue(() => {
    const now = clock.time.value;
    // Window 1: the hero's own run-in at the start of the battle.
    const introEnvelope = Math.min(
      clamp01(now / Timing.windRamp),
      clamp01((Timing.heroEnter - now) / Timing.windRamp),
    );
    // Window 2: the 'advancing' walk between packs.
    const advanceEnvelope = walking
      ? Math.min(clamp01((now - walkStartAt) / Timing.windRamp), clamp01((walkStartAt + Timing.packAdvance - now) / Timing.windRamp))
      : 0;
    return Math.max(0, Math.min(1, Math.max(introEnvelope, advanceEnvelope))) * WindVfx.maxOpacity;
  }, [walking, walkStartAt]);

  const spriteRects = useMemo<SkRect[]>(() => {
    const w = texture?.width() ?? 0;
    const h = texture?.height() ?? 0;
    return Array.from({ length: WindVfx.poolSize }, () => Skia.XYWHRect(0, 0, w, h));
  }, [texture]);

  const nativeWidth = texture ? texture.width() : 0;

  const transforms = useRSXformBuffer(WindVfx.poolSize, (val, i) => {
    'worklet';
    if (nativeWidth === 0) {
      val.set(1, 0, -4000, -4000);
      return;
    }
    const now = clock.time.value;
    const p = params[i];
    const cycleLen = VIEWPORT_WIDTH + p.length * 2;
    const traveled = ((now * p.speed + p.phase) % cycleLen + cycleLen) % cycleLen;
    const x = VIEWPORT_WIDTH + p.length - traveled;

    const designWidth = p.length;
    const s = designWidth / nativeWidth;
    const halfW = (nativeWidth * s) / 2;
    const halfH = halfW * 0.28;
    val.set(s, 0, x - halfW, p.y - halfH);
  });

  if (!texture) return null;

  return (
    <Group opacity={intensity}>
      <Atlas image={texture} sprites={spriteRects} transforms={transforms} />
    </Group>
  );
}
