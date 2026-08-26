import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useDesignScale } from '@/hooks/use-design-scale';

const BG_ASSET = require('@/assets/images/main/bg.webp');
// Natural size of the exported background artwork, in Figma design points.
const BG_WIDTH = 566;
const BG_HEIGHT = 1548;
const BG_CENTER_X_OFFSET = 34;

/** Full-bleed background for the main screen, matching Figma node 1:27/1:28. */
export function MainBackground() {
  const { width, sx, rawS } = useDesignScale();
  const bgWidth = BG_WIDTH * rawS;
  const bgHeight = BG_HEIGHT * rawS;

  return (
    <View style={styles.container}>
      <Image
        source={BG_ASSET}
        style={[
          styles.background,
          {
            width: bgWidth,
            height: bgHeight,
            left: width / 2 + BG_CENTER_X_OFFSET * sx - bgWidth / 2,
            top: 0,
          },
        ]}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#050b0d',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
  },
});
