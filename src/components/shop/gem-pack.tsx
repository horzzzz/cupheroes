import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const CIRCLE = require('@/assets/images/shop/gem-circle.webp');
const CIRCLE_LOCKED = require('@/assets/images/shop/gem-circle-locked.webp');

const SIZE = 100;
const ART_SIZE = 56;
const ART_TOP = 10;
const AMOUNT_CENTER_Y = 76.5;
const AMOUNT_BOX_HEIGHT = 30;

export type GemPackProps = {
  amount: number;
  art: number;
  /** Not unlocked yet — the circle and its pipe take the design's blue tint. */
  locked?: boolean;
  left: number;
  top: number;
  onPress?: () => void;
};

/** One buyable gem pack — Figma component `gem_shop` (nodes 1:171-1:174). */
export function GemPack({ amount, art, locked, left, top, onPress }: GemPackProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={locked}
      style={{
        position: 'absolute',
        left,
        top,
        width: SIZE,
        height: SIZE,
        transform: [{ scale: pressed && !locked ? 0.96 : 1 }],
      }}>
      <Image
        source={locked ? CIRCLE_LOCKED : CIRCLE}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
      <Image
        source={art}
        style={{
          position: 'absolute',
          top: ART_TOP,
          left: (SIZE - ART_SIZE) / 2,
          width: ART_SIZE,
          height: ART_SIZE,
        }}
        contentFit="contain"
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: AMOUNT_CENTER_Y - AMOUNT_BOX_HEIGHT / 2,
          height: AMOUNT_BOX_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none">
        <GameText style={{ fontFamily: Fonts.titan, fontSize: 24, color: Colors.white }}>
          {amount}
        </GameText>
      </View>
    </Pressable>
  );
}
