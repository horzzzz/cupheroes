import { Group, Image, RoundedRect, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { PLINKO_BOOST_PAD, PLINKO_COLORS, PLINKO_GATES, PLINKO_WALLS } from '@/constants/plinko';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * The static board -- walls, multiplier gates and the boost pad -- drawn in
 * 390x844 design coordinates (the parent `<Group transform={[{scale}]}>` on
 * the canvas applies device scale). Walls and gates are flat rounded rects,
 * exactly as in the Figma mock; only the boost pad carries art (node 1:1931).
 * Geometry comes straight from `PLINKO_WALLS` / `PLINKO_GATES`, the same
 * arrays the solver collides against, so the drawing and the physics can't
 * drift.
 *
 * Draw order: gate bands first, then the walls on top -- the gate rects run
 * the full row width and overlap the side walls and the channel dividers, so
 * the walls have to paint over them or the green geometry looks broken.
 *
 * The only moving part is the boost pad's opacity: it dims once spent,
 * matching the solver flipping `boostState` to 2.
 */
export function PlinkoBoard({ world, pad }: { world: PlinkoWorld; pad: SkImage | null }) {
  const boostOpacity = useDerivedValue(() => (world.boostState.value >= 2 ? 0.25 : 1));

  return (
    <Group>
      {PLINKO_GATES.map((g) => (
        <RoundedRect key={g.id} x={g.x0} y={g.y0} width={g.x1 - g.x0} height={g.y1 - g.y0} r={4} color={g.color} />
      ))}

      {PLINKO_WALLS.map((w) => (
        <RoundedRect
          key={w.id}
          x={w.cx - w.hx}
          y={w.cy - w.hy}
          width={w.hx * 2}
          height={w.hy * 2}
          r={w.r}
          color={PLINKO_COLORS.wall}
          origin={{ x: w.cx, y: w.cy }}
          transform={[{ rotate: w.a }]}
        />
      ))}

      {pad ? (
        <Image
          image={pad}
          x={PLINKO_BOOST_PAD.x0}
          y={PLINKO_BOOST_PAD.y0}
          width={PLINKO_BOOST_PAD.x1 - PLINKO_BOOST_PAD.x0}
          height={PLINKO_BOOST_PAD.y1 - PLINKO_BOOST_PAD.y0}
          fit="fill"
          opacity={boostOpacity}
        />
      ) : (
        <RoundedRect
          x={PLINKO_BOOST_PAD.x0}
          y={PLINKO_BOOST_PAD.y0}
          width={PLINKO_BOOST_PAD.x1 - PLINKO_BOOST_PAD.x0}
          height={PLINKO_BOOST_PAD.y1 - PLINKO_BOOST_PAD.y0}
          r={6}
          color={PLINKO_COLORS.boostPad}
          opacity={boostOpacity}
        />
      )}
    </Group>
  );
}
