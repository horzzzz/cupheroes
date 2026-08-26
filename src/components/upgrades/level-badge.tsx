import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const BADGE = require('@/assets/images/upgrades/icon-level-badge.webp');
const BADGE_LOCKED = require('@/assets/images/upgrades/icon-level-badge-locked.webp');

// Design sizes are for the 60pt badge on the ladder; the top bar's is 36pt.
const BASE_SIZE = 60;
const DISC_RATIO = 43.333 / BASE_SIZE;
const FONT_RATIO = 30 / BASE_SIZE;

// Figma greys the whole badge with a `mix-blend-color` when it is locked.
const DISC_LOCKED_START = '#6b6b6b';
const DISC_LOCKED_END = '#b0b0b0';

type LevelBadgeProps = {
  level: number;
  size?: number;
  locked?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Round level marker — Figma nodes 1:1117 (ladder) and 1:1159 (top bar).
 *
 * The ring comes from the shared sprite sheet, where it is the play button:
 * the disc is painted over it — as in the design — both to tint the middle
 * and to cover the sprite's play glyph, leaving the number free to change.
 */
export function LevelBadge({ level, size = BASE_SIZE, locked, style }: LevelBadgeProps) {
  const discSize = size * DISC_RATIO;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={locked ? BADGE_LOCKED : BADGE}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
      <LinearGradient
        colors={
          locked
            ? [DISC_LOCKED_START, DISC_LOCKED_END]
            : [Colors.progressGreenStart, Colors.progressGreenEnd]
        }
        locations={[0.48309, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: (size - discSize) / 2,
          top: size * (8.333 / BASE_SIZE),
          width: discSize,
          height: discSize,
          borderRadius: discSize / 2,
        }}
      />
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <GameText
          style={{
            fontFamily: Fonts.nunito,
            fontSize: size * FONT_RATIO,
            color: Colors.white,
          }}>
          {level}
        </GameText>
      </View>
    </View>
  );
}
