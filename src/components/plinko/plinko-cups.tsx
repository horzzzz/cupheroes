import { Group, Image, RoundedRect, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { PLINKO_CUPS } from '@/constants/plinko';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * The two gauntlet-and-cup props -- Figma node 1:1956, exported without its
 * number (the count is drawn as RN text over the canvas in `plinko-scene`).
 * The art is 172x94 design points; `redCupOffsetX` is where the red cup's
 * centre sits inside it, so the art is drawn shifted left by that much and
 * the aim x lands on the cup mouth.
 *
 * The top cup tracks `world.aimX` on the UI thread via a derived transform.
 */
export function PlinkoCups({ world, cup }: { world: PlinkoWorld; cup: SkImage | null }) {
  const topTransform = useDerivedValue(() => [{ translateX: world.aimX.value }]);

  const bottomCupX = (PLINKO_CUPS.mouthX0 + PLINKO_CUPS.mouthX1) / 2 - PLINKO_CUPS.redCupOffsetX;

  if (!cup) {
    // Fallback shapes until the art decodes -- just enough to read the emit
    // point and the catch slit.
    return (
      <Group>
        <Group transform={topTransform}>
          <RoundedRect x={-26} y={PLINKO_CUPS.emitY - 58} width={52} height={58} r={6} color="#D0342C" />
        </Group>
        <RoundedRect
          x={(PLINKO_CUPS.mouthX0 + PLINKO_CUPS.mouthX1) / 2 - 26}
          y={PLINKO_CUPS.bottomY}
          width={52}
          height={64}
          r={6}
          color="#D0342C"
        />
      </Group>
    );
  }

  return (
    <Group>
      <Group transform={topTransform}>
        <Image
          image={cup}
          x={-PLINKO_CUPS.redCupOffsetX}
          y={PLINKO_CUPS.topY}
          width={PLINKO_CUPS.topArtWidth}
          height={PLINKO_CUPS.topArtHeight}
          fit="contain"
        />
      </Group>

      <Image
        image={cup}
        x={bottomCupX}
        y={PLINKO_CUPS.bottomY}
        width={PLINKO_CUPS.topArtWidth}
        height={PLINKO_CUPS.topArtHeight}
        fit="contain"
      />
    </Group>
  );
}
