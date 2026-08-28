import { Atlas, Skia, useRSXformBuffer, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { PLINKO_TUNING } from '@/constants/plinko';
import type { GameClock } from '@/game/clock';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * Every pachinko ball in one Skia `Atlas` draw call. The transform buffer is
 * a pre-allocated `useRSXformBuffer` whose modifier mutates each `SkRSXform`
 * in place -- no per-frame array allocation, unlike the derived-array
 * approach in `ball-drop.tsx` (fine for its pool of 8, not for hundreds).
 *
 * The modifier reads `clock.time.value` so Reanimated's mapper re-runs it
 * every frame (the clock's own frame callback ticks that value) -- the same
 * trick `ball-drop.tsx` uses via `useDerivedValue`. It then reads whatever
 * the solver last wrote into the body arrays. Keying off a hand-bumped
 * counter instead is unreliable: a shared-value write from inside the solver
 * reaction doesn't dependably re-fire another mapper the same frame.
 *
 * Dead / free slots are parked far off-canvas so the fixed-length Atlas can
 * still draw them cheaply.
 */
export const PlinkoBalls = memo(function PlinkoBalls({
  world,
  clock,
  texture,
}: {
  world: PlinkoWorld;
  clock: GameClock;
  texture: SkImage;
}) {
  const size = PLINKO_TUNING.poolSize;
  const texW = texture.width();

  const sprites = useMemo<SkRect[]>(
    () => Array.from({ length: size }, () => Skia.XYWHRect(0, 0, texW, texW)),
    [size, texW],
  );

  const { posX, posY, rot, scl, cfgRadius } = world;
  const time = clock.time;

  const transforms = useRSXformBuffer(size, (val, i) => {
    'worklet';
    // Touch the clock so the mapper is scheduled every frame.
    const _t = time.value;

    const s0 = scl.value[i];
    if (s0 <= 0 || _t < 0) {
      val.set(1, 0, -2000, -2000);
      return;
    }

    const designDiameter = s0 * cfgRadius.value * 2;
    const s = designDiameter / texW;
    const a = rot.value[i];
    const scos = s * Math.cos(a);
    const ssin = s * Math.sin(a);
    const half = (texW * s) / 2;

    // RSXform anchors the source rect's (0,0) corner at (tx,ty); offset so the
    // ball's center lands on the body position.
    val.set(scos, ssin, posX.value[i] - (scos * half - ssin * half), posY.value[i] - (ssin * half + scos * half));
  });

  return <Atlas image={texture} sprites={sprites} transforms={transforms} />;
});
