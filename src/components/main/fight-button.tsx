import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const BUTTON_ASSET = require('@/assets/images/ui/button-pill.webp');

const WIDTH = 238;
const HEIGHT = 80;

type FightButtonProps = {
  onPress?: () => void;
};

export function FightButton({ onPress }: FightButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        alignSelf: 'center',
        width: WIDTH,
        height: HEIGHT,
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
            fontSize: 36,
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
