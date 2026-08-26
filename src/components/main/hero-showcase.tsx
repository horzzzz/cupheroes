import { Image } from 'expo-image';
import { View } from 'react-native';

const LIGHT_GLOW = require('@/assets/images/main/light-glow.webp');
const CHAPTER_ART = require('@/assets/images/main/chapter-art.webp');

const ART_SIZE = 250;

const GLOW_SIZE = ART_SIZE * 1.4;

export function HeroShowcase() {
  return (
    <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={LIGHT_GLOW}
        style={{
          position: 'absolute',
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          maxWidth: '140%',
          maxHeight: '140%',
        }}
        contentFit="contain"
      />
      <Image
        source={CHAPTER_ART}
        style={{ width: '100%', height: '100%', maxWidth: ART_SIZE, maxHeight: ART_SIZE }}
        contentFit="contain"
      />
    </View>
  );
}
