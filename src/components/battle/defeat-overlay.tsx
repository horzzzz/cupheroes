import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { RewardRow } from '@/components/ui/reward-row';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { WAVE_COUNT } from '@/constants/battle';
import type { Reward } from '@/constants/economy';

// Exported straight from Figma (node 1:1769) with the "YOU LOST..." lettering
// already baked into the art -- see the project memory on exporting banners
// with their text, not as a blank ribbon.
const BANNER_ICON = require('@/assets/images/battle/banner-defeat.webp');
const AD_ICON = require('@/assets/images/ui/icon-ad.webp');

const BANNER_WIDTH = 210;
const BANNER_HEIGHT = 70;
const AD_BUTTON_WIDTH = 220;
const AD_BUTTON_HEIGHT = 50;

/**
 * Shown when the hero falls -- Figma node 1:1704, an end-of-run summary
 * screen. `reward` is already granted to the wallet by the battle store the
 * instant the phase flips to `defeat` -- this only displays what landed for
 * the waves actually cleared.
 */
export function DefeatOverlay({
  wavesCompleted,
  reward,
  onContinue,
}: {
  wavesCompleted: number;
  reward: Reward;
  onContinue: () => void;
}) {
  return (
    <Pressable style={styles.root} onPress={onContinue}>
      <View style={styles.backdrop} />

      <Image source={BANNER_ICON} style={styles.banner} contentFit="contain" />

      <GameText style={styles.subtitle}>Waves completed:</GameText>
      <GameText style={styles.wavesText}>{`${wavesCompleted}/${WAVE_COUNT}`}</GameText>

      <RewardRow reward={reward} />

      <Pressable
        style={styles.adButton}
        onPress={() => {
          // TODO(ads): watch a rewarded ad, then grant this same `reward` a second time.
        }}>
        <Image source={AD_ICON} style={{ width: 22, height: 22 }} contentFit="contain" />
        <GameText style={styles.adLabel}>Double reward</GameText>
      </Pressable>

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
  adButton: {
    width: AD_BUTTON_WIDTH,
    height: AD_BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adLabel: {
    fontFamily: Fonts.titan,
    fontSize: 16,
    color: Colors.white,
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
