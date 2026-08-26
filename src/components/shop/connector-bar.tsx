import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

const LENGTH = 120;
const THICKNESS = 18;

// The bar reads as a metal tube: dark at both edges, bright along its middle.
const TUBE_EDGE = '#ee8b00';
const TUBE_MIDDLE = '#ffe31d';
const GLOW = 'rgba(255,247,0,0.2)';
const GLOW_FADE = 'rgba(255,247,0,0)';

// Figma's `filter_disabled` (a blue gradient, multiplied at 55% and then
// color-blended) resolved against each of the colors above.
const LOCKED_EDGE = '#1e60b5';
const LOCKED_MIDDLE = '#4486db';
const LOCKED_BORDER = '#000914';
const LOCKED_GLOW = 'rgba(140,190,255,0.2)';
const LOCKED_GLOW_FADE = 'rgba(140,190,255,0)';

type ConnectorBarProps = {
  orientation: 'horizontal' | 'vertical';
  locked?: boolean;
  left: number;
  top: number;
};

/**
 * The pipe joining two gem packs — Figma nodes 1:168/1:169/1:170. The
 * horizontal ones are the same 18x120 bar rotated 90deg in the design, so
 * both gradients run across the bar's thickness and the top-to-bottom glow
 * ends up at its left end.
 */
export function ConnectorBar({ orientation, locked, left, top }: ConnectorBarProps) {
  const horizontal = orientation === 'horizontal';

  return (
    <View
      style={{
        position: 'absolute',
        left,
        top,
        width: horizontal ? LENGTH : THICKNESS,
        height: horizontal ? THICKNESS : LENGTH,
        borderWidth: 1,
        borderColor: locked ? LOCKED_BORDER : Colors.darkPanel,
      }}>
      <LinearGradient
        colors={
          locked
            ? [LOCKED_EDGE, LOCKED_MIDDLE, LOCKED_MIDDLE, LOCKED_EDGE]
            : [TUBE_EDGE, TUBE_MIDDLE, TUBE_MIDDLE, TUBE_EDGE]
        }
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={horizontal ? { x: 0, y: 1 } : { x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={locked ? [LOCKED_GLOW, LOCKED_GLOW_FADE] : [GLOW, GLOW_FADE]}
        locations={[0.07, 0.495]}
        start={horizontal ? { x: 0, y: 0 } : { x: 0, y: 1 }}
        end={horizontal ? { x: 1, y: 0 } : { x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
