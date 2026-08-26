import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useDesignScale } from '@/hooks/use-design-scale';

const BG_ASSET = require('@/assets/images/loader/bg.jpg');
// Natural size of the exported background artwork, in Figma design points.
const BG_WIDTH = 420;
const BG_HEIGHT = 1148;
const BG_CENTER_Y_OFFSET = 42;

/**
 * Full-bleed background shared by the loading and start screens: a dark
 * backdrop with the swamp/knight illustration centered slightly below the
 * screen's vertical middle, matching Figma nodes 1:2317 / 1:7.
 */
export function LoaderBackground() {
  const { width, height, s } = useDesignScale();
  const bgWidth = BG_WIDTH * s;
  const bgHeight = BG_HEIGHT * s;

  return (
    <View style={styles.container}>
      <Image
        source={BG_ASSET}
        style={[
          styles.background,
          {
            width: bgWidth,
            height: bgHeight,
            left: width / 2 - bgWidth / 2,
            top: height / 2 + BG_CENTER_Y_OFFSET * s - bgHeight / 2,
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
