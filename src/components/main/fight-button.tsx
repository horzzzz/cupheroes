import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDesignScale } from '@/hooks/use-design-scale';

const BUTTON_ASSET = require('@/assets/images/ui/button-pill.webp');

const WIDTH_BASE = 238;
const HEIGHT_BASE = 80;
const FONT_SIZE_BASE = 36;
const WIDTH_MIN = 180;
const WIDTH_MAX = 238;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type FightButtonProps = {
  onPress?: () => void;
};

export function FightButton({ onPress }: FightButtonProps) {
  const [pressed, setPressed] = useState(false);
  const { s } = useDesignScale();
  const width = clamp(WIDTH_BASE * s, WIDTH_MIN, WIDTH_MAX);
  const height = width * (HEIGHT_BASE / WIDTH_BASE);
  const fontSize = FONT_SIZE_BASE * (width / WIDTH_BASE);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        alignSelf: 'center',
        width,
        height,
        maxWidth: '100%',
        marginBottom: 24,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }}>
      <Image source={BUTTON_ASSET} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={styles.label} pointerEvents="none">
        <GameText
          style={{
            textTransform: 'uppercase',
            fontFamily: Fonts.titan,
            fontSize,
            color: Colors.white,
          }}>
          FIGHT
        </GameText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
