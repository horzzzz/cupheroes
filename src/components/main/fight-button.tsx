import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDesignScale } from '@/hooks/use-design-scale';

const BUTTON_ASSET = require('@/assets/images/ui/button-pill.webp');

const WIDTH = 258;
const HEIGHT = 95;
const TOP = 589;

type FightButtonProps = {
  onPress?: () => void;
};

/** Main "FIGHT" call to action — Figma node 1:77, reuses the loader's pill texture. */
export function FightButton({ onPress }: FightButtonProps) {
  const { width, sy, s } = useDesignScale();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        position: 'absolute',
        left: width / 2 - (WIDTH * s) / 2,
        top: TOP * sy,
        width: WIDTH * s,
        height: HEIGHT * s,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }}>
      <Image source={BUTTON_ASSET} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={styles.label} pointerEvents="none">
        <GameText
          style={{
            textTransform: 'uppercase',
            fontFamily: Fonts.titan,
            fontSize: 36 * s,
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
