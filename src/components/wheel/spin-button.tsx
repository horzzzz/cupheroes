import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const SPIN_ASSET = require('@/assets/images/wheel/button-spin.webp');
const SPIN_AD_ASSET = require('@/assets/images/wheel/button-spin-ad.webp');

const WIDTH = 190;
const HEIGHT = 70;

export type SpinButtonVariant = 'primary' | 'ad' | 'locked';

type SpinButtonProps = {
  variant: SpinButtonVariant;
  /** Only used by the `locked` variant — Figma node 1:422, e.g. "13H 24M 15S". */
  timerLabel?: string;
  disabled?: boolean;
  onPress?: () => void;
};

/**
 * The wheel screen's spin pill — same 190x70 button in three states from
 * Figma: free spin (1:339), watch-an-ad spin (1:424/1:425), and the locked
 * free spin with a countdown (1:420, the same blue asset at `opacity: 0.5`
 * per the frame's own `opacity-50`, no separate "disabled" artwork).
 */
export function SpinButton({ variant, timerLabel, disabled, onPress }: SpinButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || variant === 'locked';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      style={{
        width: WIDTH,
        height: HEIGHT,
        opacity: variant === 'locked' ? 0.5 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
      }}>
      <Image
        source={variant === 'ad' ? SPIN_AD_ASSET : SPIN_ASSET}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
      />

      {variant === 'locked' && (
        <View style={styles.timerRow} pointerEvents="none">
          <GameText style={styles.timer}>{timerLabel}</GameText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // "SPIN" is baked into the artwork (centered around y≈20 of the 70pt
  // button); this only adds the dynamic countdown line below it, matching
  // Figma node 1:422's y=34 offset.
  timerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 38,
    alignItems: 'center',
  },
  timer: {
    textTransform: 'uppercase',
    fontFamily: Fonts.titan,
    fontSize: 18,
    color: Colors.white,
  },
});
