import { Image } from 'expo-image';
import { View } from 'react-native';

import { locationIndex } from '@/constants/chapters';
import { useDesignScale } from '@/hooks/use-design-scale';

const LIGHT_GLOW = require('@/assets/images/main/light-glow.webp');
// One require per location -- Metro can't resolve a dynamic path. Indexed by
// `locationIndex`, so it cycles with the chapter counter.
const CHAPTER_ART = [
  require('@/assets/images/main/chapter-art-c1.webp'),
  require('@/assets/images/main/chapter-art-c2.webp'),
  require('@/assets/images/main/chapter-art-c3.webp'),
  require('@/assets/images/main/chapter-art-c4.webp'),
];

// Design-frame reference size (390x844 frame) and safety clamps for real devices.
const ART_SIZE_BASE = 250;
const ART_SIZE_MIN = 160;
const ART_SIZE_MAX = 250;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function HeroShowcase({ chapter }: { chapter: number }) {
  const { s } = useDesignScale();
  const artSize = clamp(ART_SIZE_BASE * s, ART_SIZE_MIN, ART_SIZE_MAX);
  const glowSize = artSize * 1.4;

  return (
    <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={LIGHT_GLOW}
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          maxWidth: '140%',
          maxHeight: '140%',
        }}
        contentFit="contain"
      />
      <Image
        source={CHAPTER_ART[locationIndex(chapter)]}
        style={{ width: artSize, height: artSize, maxWidth: '100%', maxHeight: '100%' }}
        contentFit="contain"
      />
    </View>
  );
}
