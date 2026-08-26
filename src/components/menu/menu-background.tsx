import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const BG_ASSET = require('@/assets/images/menu/bg.webp');

/**
 * Full-bleed background shared by Settings and Pause — Figma nodes
 * 1:2188/1:2218. Unlike the main screen's background, this crop already
 * matches the 390x844 design frame's aspect ratio, so a plain cover fill is
 * enough (no proportional offset math needed).
 */
export function MenuBackground() {
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
