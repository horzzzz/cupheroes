import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type TubePalette = {
  /** Color at both long edges — the shaded side of the tube. */
  edge: string;
  /** Color along the middle — the lit side. */
  middle: string;
  border: string;
  glow: string;
  glowFade: string;
};

/** The gold pipe used by the shop's gem grid and the upgrade ladder's rails. */
export const GoldTube: TubePalette = {
  edge: '#ee8b00',
  middle: '#ffe31d',
  border: '#250404',
  glow: 'rgba(255,247,0,0.2)',
  glowFade: 'rgba(255,247,0,0)',
};

/** Figma's `filter_disabled` (blue gradient, multiply 55% + color) over the gold. */
export const LockedBlueTube: TubePalette = {
  edge: '#1e60b5',
  middle: '#4486db',
  border: '#000914',
  glow: 'rgba(140,190,255,0.2)',
  glowFade: 'rgba(140,190,255,0)',
};

/** Figma's locked-upgrade filter (#bfbfbf multiply + #d9d9d9 color) over the gold. */
export const LockedGreyTube: TubePalette = {
  edge: '#737373',
  middle: '#a0a0a0',
  border: '#0a0a0a',
  glow: 'rgba(160,160,160,0.2)',
  glowFade: 'rgba(160,160,160,0)',
};

type TubeBarProps = {
  orientation: 'horizontal' | 'vertical';
  palette?: TubePalette;
  borderWidth?: number;
  /** Outline the short ends too. Off for bars that run past the screen edges. */
  capped?: boolean;
  /** The lengthwise highlight. Off where only the tube's middle is visible. */
  glow?: boolean;
  /** Carries the bar's size and position. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A metal pipe: dark at both long edges, bright down the middle, with a soft
 * highlight running along its length — Figma nodes 1:168-1:170 (shop) and
 * 1:1107/1:1110-1:1112 (upgrades), which are all the same element rotated.
 */
export function TubeBar({
  orientation,
  palette = GoldTube,
  borderWidth = 1,
  capped = true,
  glow = true,
  style,
}: TubeBarProps) {
  const horizontal = orientation === 'horizontal';
  const lengthwise = capped ? borderWidth : 0;

  return (
    <View
      style={[
        {
          borderColor: palette.border,
          borderTopWidth: horizontal ? borderWidth : lengthwise,
          borderBottomWidth: horizontal ? borderWidth : lengthwise,
          borderLeftWidth: horizontal ? lengthwise : borderWidth,
          borderRightWidth: horizontal ? lengthwise : borderWidth,
        },
        style,
      ]}>
      <LinearGradient
        colors={[palette.edge, palette.middle, palette.middle, palette.edge]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={horizontal ? { x: 0, y: 1 } : { x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {glow ? (
        <LinearGradient
          colors={[palette.glow, palette.glowFade]}
          locations={[0.07, 0.495]}
          start={horizontal ? { x: 0, y: 0 } : { x: 0, y: 1 }}
          end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}
