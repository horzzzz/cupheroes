import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { WheelSector } from '@/components/wheel/fortune-wheel';
import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const LIGHT_GLOW = require('@/assets/images/main/light-glow.webp');
const VICTORY_BANNER = require('@/assets/images/wheel/victory-banner.webp');
const YOUR_REWARD_TEXT = require('@/assets/images/wheel/text-your-reward.webp');
const COLLECT_ASSET = require('@/assets/images/wheel/button-collect.webp');
const ICON_EXP = require('@/assets/images/wheel/icon-exp.webp');
const ICON_COIN = require('@/assets/images/wheel/icon-coin.webp');
const ICON_GEM = require('@/assets/images/wheel/icon-gem.webp');

const SECTOR_ICON: Record<WheelSector['type'], number> = {
  exp: ICON_EXP,
  coin: ICON_COIN,
  gem: ICON_GEM,
};

const BANNER_WIDTH = 358;
const BANNER_HEIGHT = 118;
// Tight ink bounds of the "YOUR REWARD" text render (Figma node 1:519),
// no banner shape behind it — just the gradient text itself.
const REWARD_TEXT_WIDTH = 176;
const REWARD_TEXT_HEIGHT = 24;
// Natural render size of the reused `light-glow.webp` (see HeroShowcase),
// kept at its own aspect ratio rather than forced square.
const GLOW_WIDTH = 390;
const GLOW_HEIGHT = 445;
const COLLECT_WIDTH = 260;
const COLLECT_HEIGHT = 100;

type WheelResultOverlayProps = {
  sector: WheelSector;
  onCollect: () => void;
};

/**
 * Reward popup shown after a spin lands — Figma node 1:432. Sits as a plain
 * absolute layer above the wheel screen (not an RN `Modal`) so the darkened
 * wheel keeps showing through underneath, matching the design.
 */
export function WheelResultOverlay({ sector, onCollect }: WheelResultOverlayProps) {
  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.backdrop} pointerEvents="none" />

      <View style={styles.column} pointerEvents="box-none">
        <Image
          source={LIGHT_GLOW}
          style={{ position: 'absolute', width: GLOW_WIDTH, height: GLOW_HEIGHT }}
          contentFit="contain"
          pointerEvents="none"
        />

        <Image
          source={VICTORY_BANNER}
          style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}
          contentFit="contain"
        />

        <Image
          source={YOUR_REWARD_TEXT}
          style={{ marginTop: 24, width: REWARD_TEXT_WIDTH, height: REWARD_TEXT_HEIGHT }}
          contentFit="contain"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <Image source={SECTOR_ICON[sector.type]} style={{ width: 48, height: 48 }} contentFit="contain" />
          <GameText
            style={{
              textTransform: 'uppercase',
              fontFamily: Fonts.titan,
              fontSize: 24,
              color: Colors.white,
            }}>
            {sector.value}
          </GameText>
        </View>

        <GamePressable
          onPress={onCollect}
          style={{ marginTop: 40, width: COLLECT_WIDTH, height: COLLECT_HEIGHT }}>
          <Image source={COLLECT_ASSET} style={StyleSheet.absoluteFill} contentFit="fill" />
        </GamePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,6,33,0.5)',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
