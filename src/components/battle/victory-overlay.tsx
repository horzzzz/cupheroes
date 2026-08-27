import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

// Exported straight from Figma (node 1:1575) with the "VICTORY!" lettering
// and its tilt already baked into the art -- see the project memory on
// exporting banners with their text, not as a blank ribbon.
const BANNER_ICON = require('@/assets/images/battle/banner-victory.webp');
const BUTTON_ICON = require('@/assets/images/ui/button-pill.webp');

const BANNER_WIDTH = 210;
const BANNER_HEIGHT = 70;
const BUTTON_WIDTH = 190;
const BUTTON_HEIGHT = 73;

/**
 * Shown once the boss on wave 15 falls -- Figma node 1:1511. There's no
 * reward economy wired up yet (chests, coins, exp), so this only carries
 * what's real right now: the milestone and a way back to the hub.
 */
export function VictoryOverlay({ onCollect }: { onCollect: () => void }) {
  return (
    <View style={styles.root} pointerEvents="auto">
      <View style={styles.backdrop} />

      <Image source={BANNER_ICON} style={styles.banner} contentFit="contain" />

      <GameText style={styles.subtitle}>Chapter completed!</GameText>

      <Pressable onPress={onCollect} style={styles.button}>
        <Image source={BUTTON_ICON} style={StyleSheet.absoluteFill} contentFit="fill" />
        <GameText style={styles.buttonLabel}>Collect</GameText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,6,33,0.72)' },
  banner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  subtitle: {
    fontFamily: Fonts.titan,
    fontSize: 20,
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontFamily: Fonts.titan,
    fontSize: 28,
    color: Colors.white,
    textTransform: 'uppercase',
  },
});
