import { Group, Image, RoundedRect, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { PLINKO_COLORS, type PlinkoLayout } from '@/constants/plinko';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * The static board -- walls, multiplier gates and the boost pad -- drawn in
 * 390x844 design coordinates (the parent `<Group transform={[{scale}]}>` on
 * the canvas applies device scale). Walls and gates are flat rounded rects,
 * exactly as in the Figma mock; only the boost pad carries art (node 1:1931).
 * Geometry comes straight from the active `layout` (walls / gates / pad), the
 * same object the solver collides against, so the drawing and the physics
 * can't drift.
 *
 * Draw order: gate bands first, then the walls on top -- the gate rects run
 * the full row width and overlap the side walls and the channel dividers, so
 * the walls have to paint over them or the green geometry looks broken. Gate
 * bands are sharp-cornered rectangles so abutting gates form one seamless
 * strip (rounded corners left dark notches at every seam).
 *
 * The boost pad is drawn as a flat blue panel spanning its whole collider
 * width, with the chevron art (`pad-boost.webp`, native 146x50) laid on top at
 * its true aspect ratio and centred -- stretching the webp across a wide pad
 * smeared the icon. The panel dims once the pad is spent (`boostState >= 2`).
 */
/** Native aspect ratio of `pad-boost.webp` (146 x 50). */
const PAD_ART_ASPECT = 146 / 50;
export function PlinkoBoard({
  world,
  pad,
  layout,
}: {
  world: PlinkoWorld;
  pad: SkImage | null;
  layout: PlinkoLayout;
}) {
  const boostOpacity = useDerivedValue(() => (world.boostState.value >= 2 ? 0.25 : 1));
  const boostPad = layout.pad;

  return (
    <Group>
      {layout.gates.map((g) => (
        <RoundedRect key={g.id} x={g.x0} y={g.y0} width={g.x1 - g.x0} height={g.y1 - g.y0} r={0} color={g.color} />
      ))}

      {layout.walls.map((w) => (
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

      {boostPad &&
        (() => {
          const pw = boostPad.x1 - boostPad.x0;
          const ph = boostPad.y1 - boostPad.y0;
          const artW = Math.min(pw, ph * PAD_ART_ASPECT);
          return (
            <Group opacity={boostOpacity}>
              <RoundedRect x={boostPad.x0} y={boostPad.y0} width={pw} height={ph} r={4} color={PLINKO_COLORS.boostPad} />
              {pad && (
                <Image
                  image={pad}
                  x={boostPad.x0 + (pw - artW) / 2}
                  y={boostPad.y0}
                  width={artW}
                  height={ph}
                  fit="fill"
                />
              )}
            </Group>
          );
        })()}
    </Group>
  );
}
