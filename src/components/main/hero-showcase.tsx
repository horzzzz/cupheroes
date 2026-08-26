import { Image } from 'expo-image';
import { View } from 'react-native';

import { useDesignScale } from '@/hooks/use-design-scale';

const LIGHT_GLOW = require('@/assets/images/main/light-glow.webp');
const CHAPTER_ART = require('@/assets/images/main/chapter-art.webp');

const GLOW_LEFT = 0;
const GLOW_TOP = 227;
const GLOW_WIDTH = 390;
// Exported glow art is taller than its Figma frame (390) because the outer
// rings bleed past the frame edge; scale from its own aspect ratio.
const GLOW_HEIGHT = 445;

const ART_LEFT = 56;
const ART_TOP = 270;
const ART_SIZE = 280;

/** Chapter island artwork with hero, floating over the ambient glow — Figma nodes 1:69/1:73. */
export function HeroShowcase() {
  const { sx, sy, s } = useDesignScale();

  return (
    <View>
      <Image
        source={LIGHT_GLOW}
        style={{
          position: 'absolute',
          left: GLOW_LEFT * sx,
          top: GLOW_TOP * sy - ((GLOW_HEIGHT - 390) / 2) * s,
          width: GLOW_WIDTH * s,
          height: GLOW_HEIGHT * s,
        }}
        contentFit="contain"
      />
      <Image
        source={CHAPTER_ART}
        style={{
          position: 'absolute',
          left: ART_LEFT * sx,
          top: ART_TOP * sy,
          width: ART_SIZE * s,
          height: ART_SIZE * s,
        }}
        contentFit="contain"
      />
    </View>
  );
}
