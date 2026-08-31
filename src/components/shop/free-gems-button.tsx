import { Image } from 'expo-image';
import { useState } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { GamePressable } from '@/components/ui/game-pressable';

const BUTTON_ASSET = require('@/assets/images/shop/button-free.webp');

const WIDTH = 190;
const HEIGHT = 70;

/**
 * Rewarded-ad gems button — Figma node 1:158. The "AD" badge and the "FREE"
 * label are baked into the artwork, same as the wheel screen's spin buttons.
 */
export function FreeGemsButton({
  style,
  onPress,
}: {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <GamePressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[{ width: WIDTH, height: HEIGHT, transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}>
      <Image
        source={BUTTON_ASSET}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
      />
    </GamePressable>
  );
}
