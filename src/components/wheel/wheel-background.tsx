import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const BG_ASSET = require('@/assets/images/wheel/bg.webp');

/**
 * Full-bleed background for the wheel screen — Figma node 1:273. Same crop
 * approach as `MenuBackground`: the export is already in the 390x844
 * design-frame aspect ratio, so a plain `cover` fill is enough.
 */
export function WheelBackground() {
  return <Image source={BG_ASSET} style={styles.background} contentFit="cover" />;
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
