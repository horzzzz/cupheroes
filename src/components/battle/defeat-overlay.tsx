import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { WAVE_COUNT } from '@/constants/battle';

// Exported straight from Figma (node 1:1769) with the "YOU LOST..." lettering
// already baked into the art -- see the project memory on exporting banners
// with their text, not as a blank ribbon.
const BANNER_ICON = require('@/assets/images/battle/banner-defeat.webp');

const BANNER_WIDTH = 210;
const BANNER_HEIGHT = 70;

/**
 * Shown when the hero falls -- Figma node 1:1704. That screen is an
 * end-of-run summary (waves completed, rewards, a double-reward ad) rather
 * than a mid-wave revive prompt; with no reward economy wired up yet, this
 * keeps only what's real: the milestone and a tap back to the hub.
 */
export function DefeatOverlay({ wavesCompleted, onContinue }: { wavesCompleted: number; onContinue: () => void }) {
  return (
    <Pressable style={styles.root} onPress={onContinue}>
      <View style={styles.backdrop} />

      <Image source={BANNER_ICON} style={styles.banner} contentFit="contain" />

      <GameText style={styles.subtitle}>Waves completed:</GameText>
      <GameText style={styles.wavesText}>{`${wavesCompleted}/${WAVE_COUNT}`}</GameText>

      <GameText style={styles.tapHint}>Tap to continue</GameText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,6,33,0.72)' },
  banner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  subtitle: {
    fontFamily: Fonts.titan,
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  wavesText: {
    fontFamily: Fonts.titan,
    fontSize: 24,
    color: '#ff4e4e',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tapHint: {
    position: 'absolute',
    bottom: 60,
    fontFamily: Fonts.titan,
    fontSize: 18,
    color: Colors.white,
    textTransform: 'uppercase',
  },
});
