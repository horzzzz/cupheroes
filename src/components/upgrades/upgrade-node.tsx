import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { type UpgradeKind } from '@/constants/upgrades';
import { formatCompact } from '@/utils/format-number';

const FRAME = require('@/assets/images/upgrades/node-frame.webp');
const FRAME_LOCKED = require('@/assets/images/upgrades/node-frame-locked.webp');

const ICONS: Record<UpgradeKind, { active: number; locked: number }> = {
  attack: {
    active: require('@/assets/images/upgrades/icon-attack.webp'),
    locked: require('@/assets/images/upgrades/icon-attack-locked.webp'),
  },
  health: {
    active: require('@/assets/images/upgrades/icon-health.webp'),
    locked: require('@/assets/images/upgrades/icon-health-locked.webp'),
  },
  defence: {
    active: require('@/assets/images/upgrades/icon-defence.webp'),
    locked: require('@/assets/images/upgrades/icon-defence-locked.webp'),
  },
};

export const NODE_SIZE = 150;
const ICON_SIZE = 100;
const ICON_TOP = 20;
const VALUE_CENTER_Y = NODE_SIZE - 30.5;
const VALUE_BOX_HEIGHT = 30;

type UpgradeNodeProps = {
  kind: UpgradeKind;
  value: number;
  locked?: boolean;
  /** Already bought -- draws a gold checkmark badge over the corner. No dedicated Figma asset yet, drawn in code as a placeholder (see the economy plan). */
  owned?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

/**
 * One rung of the ladder — Figma component `upgrade_*_active` (nodes
 * 1:1113-1:1116). Locked nodes swap in greyscale artwork, which is how
 * Figma's `mix-blend-color` disabled filter resolves.
 */
export function UpgradeNode({
  kind,
  value,
  locked,
  owned,
  style,
  onPress,
}: UpgradeNodeProps) {
  const [pressed, setPressed] = useState(false);
  const icon = ICONS[kind];

  return (
    <GamePressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        { width: NODE_SIZE, height: NODE_SIZE, transform: [{ scale: pressed ? 0.96 : 1 }] },
        style,
      ]}>
      <Image
        source={locked ? FRAME_LOCKED : FRAME}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
      <Image
        source={locked ? icon.locked : icon.active}
        style={{
          position: 'absolute',
          left: (NODE_SIZE - ICON_SIZE) / 2,
          top: ICON_TOP,
          width: ICON_SIZE,
          height: ICON_SIZE,
        }}
        contentFit="contain"
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: VALUE_CENTER_Y - VALUE_BOX_HEIGHT / 2,
          height: VALUE_BOX_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none">
        <GameText style={{ fontFamily: Fonts.titan, fontSize: 18, color: Colors.white }}>
          +{formatCompact(value)}
        </GameText>
      </View>

      {owned ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#ffd52c',
            borderWidth: 2,
            borderColor: Colors.white,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pointerEvents="none">
          <GameText style={{ fontFamily: Fonts.titan, fontSize: 16, color: '#0a3061' }}>✓</GameText>
        </View>
      ) : null}
    </GamePressable>
  );
}
