import { Group, Image, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, withTiming } from 'react-native-reanimated';

import { BattleFrame, Timing } from '@/constants/battle';
import { useBattleStore } from '@/game/battle/store';
import { spriteDesignSize, type SpriteSet } from '@/game/sprites';

/**
 * Three copies of the one exported background crop -- normal, mirrored,
 * normal -- laid edge to edge exactly like the Figma frame (`location_1`,
 * node 1:2103: three 390-wide tiles, the middle one flipped). The whole
 * strip pans left a fixed nudge per pack (each wave is two packs -- see
 * `HALVES_PER_WAVE`) as a "moving forward" cue; with only one tile of art
 * there's no new scenery to reveal by panning further, so the shift stays
 * small and caps well short of running off the strip.
 */

const VIEWPORT_WIDTH = BattleFrame.width;
const VIEWPORT_HEIGHT = BattleFrame.canvasHeight;
const SHIFT_PER_PACK = 26;

type BattleBackgroundProps = {
  sprites: SpriteSet;
};

export function BattleBackground({ sprites }: BattleBackgroundProps) {
  const packIndex = useBattleStore((s) => s.packIndex);
  const tile = sprites.bgTile;
  const tileSize = tile ? spriteDesignSize(tile) : { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT };
  const maxShift = tileSize.width * 2;
  const targetShift = Math.min(Math.max(0, packIndex) * SHIFT_PER_PACK, maxShift);

  // A pack change re-renders this component at most a couple of times per
  // wave, so a plain `withTiming` easing the pan is fine here -- unlike
  // combat beats, this is ambient scenery with no gameplay timing to keep in
  // lockstep with pause/x2.
  const shift = useDerivedValue(() => withTiming(targetShift, { duration: Timing.packAdvance * 1000 }), [targetShift]);
  // Both derived values must run on every render regardless of whether
  // `tile` has loaded yet -- bailing out early further down must never
  // change how many hooks this component calls.
  const groupTransform = useDerivedValue(() => [{ translateX: -shift.value }]);

  if (!tile) {
    return <Rect x={0} y={0} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} color="#8dbd1b" />;
  }

  return (
    <Group clip={{ x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}>
      <Rect x={0} y={0} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} color="#8dbd1b" />
      <Group transform={groupTransform}>
        <Image image={tile} x={0} y={0} width={tileSize.width} height={tileSize.height} fit="fill" />
        <Image
          image={tile}
          x={tileSize.width}
          y={0}
          width={tileSize.width}
          height={tileSize.height}
          fit="fill"
          transform={[{ scaleX: -1 }]}
          origin={{ x: tileSize.width * 1.5, y: tileSize.height / 2 }}
        />
        <Image image={tile} x={tileSize.width * 2} y={0} width={tileSize.width} height={tileSize.height} fit="fill" />
      </Group>
    </Group>
  );
}
