import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

/**
 * One health bar, positioned in absolute design points and scaled like the
 * battle canvas below it (see `battle.tsx`) so the two layers line up. Kept
 * as plain RN views rather than Skia -- the bar sits at a fixed slot
 * position regardless of the sprite's own idle bob/lunge, so there's no
 * per-frame sync needed with the canvas, just a width tween on health
 * changes.
 */

const BAR_HEIGHT = 16;
const TRACK_HEIGHT = 10;
const FILL_HEIGHT = 8;
const TRACK_TOP = 3;
const FILL_INSET = 1;
const BADGE_SIZE = 16;

const HERO_FILL: [string, string] = ['#0dff00', '#00b421'];
const ENEMY_FILL: [string, string] = ['#ff0000', '#b40000'];

type HealthBarProps = {
  x: number;
  y: number;
  width: number;
  scale: number;
  health: number;
  maxHealth: number;
  variant: 'hero' | 'enemy';
  armor?: number;
};

export function HealthBar({ x, y, width, scale, health, maxHealth, variant, armor }: HealthBarProps) {
  const ratio = useSharedValue(maxHealth > 0 ? health / maxHealth : 0);

  useEffect(() => {
    ratio.value = withTiming(maxHealth > 0 ? Math.max(0, health / maxHealth) : 0, { duration: 250 });
  }, [health, maxHealth, ratio]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${ratio.value * 100}%` }));

  return (
    <View style={{ position: 'absolute', left: x * scale, top: y * scale, width: width * scale, height: BAR_HEIGHT * scale }}>
      <View
        style={{
          position: 'absolute',
          top: TRACK_TOP * scale,
          left: 0,
          width: width * scale,
          height: TRACK_HEIGHT * scale,
          borderRadius: (TRACK_HEIGHT / 2) * scale,
          backgroundColor: Colors.trackBackground,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: (TRACK_TOP + FILL_INSET) * scale,
            left: FILL_INSET * scale,
            height: FILL_HEIGHT * scale,
            borderRadius: (FILL_HEIGHT / 2) * scale,
            overflow: 'hidden',
          },
          fillStyle,
        ]}>
        <LinearGradient
          colors={variant === 'hero' ? HERO_FILL : ENEMY_FILL}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <GameText
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: BAR_HEIGHT * scale,
          textAlign: 'center',
          textAlignVertical: 'center',
          fontFamily: Fonts.nunito,
          fontSize: 12 * scale,
          color: Colors.white,
        }}>
        {Math.max(0, Math.round(health))}
      </GameText>
      {variant === 'hero' && armor !== undefined && (
        <View
          style={{
            position: 'absolute',
            left: -(BADGE_SIZE / 2) * scale,
            top: 0,
            width: BADGE_SIZE * scale,
            height: BADGE_SIZE * scale,
            borderRadius: (BADGE_SIZE / 2) * scale,
            backgroundColor: '#0294fa',
            borderWidth: 1,
            borderColor: Colors.darkPanel,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <GameText style={{ fontFamily: Fonts.nunito, fontSize: 10 * scale, color: Colors.white }}>{armor}</GameText>
        </View>
      )}
    </View>
  );
}
