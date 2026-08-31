import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type TextProps, type TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';

import { OutlineCopies, defaultStrokeWidth } from './text-stroke';

type GameTextProps = TextProps & {
  /** Renders the text filled with the brand yellow->orange gradient instead of a flat color. */
  gradient?: boolean;
  /** Overrides the default gradient colors (only used when `gradient` is set). */
  gradientColors?: [string, string, ...string[]];
  /** Overrides the default gradient stop positions (only used when `gradient` is set). */
  gradientLocations?: [number, number, ...number[]];
  /** Overrides the default left-to-right gradient direction (only used when `gradient` is set). */
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  /** Set `false` to drop the black outline. Defaults to `true`. */
  outline?: boolean;
  /** Outline stroke width in px. Defaults to a value derived from `fontSize`. */
  outlineWidth?: number;
  /** Outline color. Defaults to solid black. */
  outlineColor?: string;
};

/**
 * Text primitive shared across the game: the flat black "comic outline" from the
 * Figma designs (eight offset copies drawn under the fill) plus an optional
 * gradient fill for headline text.
 */
export function GameText({
  style,
  gradient,
  gradientColors,
  gradientLocations,
  gradientStart,
  gradientEnd,
  outline = true,
  outlineWidth,
  outlineColor = '#000000',
  children,
  ...rest
}: GameTextProps) {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const strokeWidth = outlineWidth ?? defaultStrokeWidth(flattened?.fontSize as number | undefined);
  const hasOutline = outline && strokeWidth > 0;

  if (gradient) {
    // MaskedView sizes itself to its (non-mask) children, so a hidden copy of
    // the text forces the gradient to the right dimensions. The outline copies
    // sit underneath to reproduce the stroke the mask itself can't carry.
    return (
      <View>
        {hasOutline && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <OutlineCopies
              textStyle={flattened}
              width={strokeWidth}
              color={outlineColor}
              textProps={rest}>
              {children}
            </OutlineCopies>
          </View>
        )}
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Text style={flattened} {...rest}>
              {children}
            </Text>
          }>
          <Text style={[flattened, styles.hidden]} {...rest}>
            {children}
          </Text>
          <LinearGradient
            colors={gradientColors ?? [Colors.gradientStart, Colors.gradientEnd]}
            locations={gradientLocations}
            start={gradientStart ?? { x: 0, y: 0 }}
            end={gradientEnd ?? { x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
        {/* Invisible in-flow copy so the wrapping View gets the text's size. */}
        <Text style={[flattened, styles.hidden]} {...rest}>
          {children}
        </Text>
      </View>
    );
  }

  if (!hasOutline) {
    return (
      <Text style={flattened} {...rest}>
        {children}
      </Text>
    );
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <OutlineCopies
        textStyle={flattened}
        width={strokeWidth}
        color={outlineColor}
        textProps={rest}>
        {children}
      </OutlineCopies>
      <Text style={flattened} {...rest}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // No `alignSelf` / width / flex override here: the wrapper must behave like
    // the bare <Text> it replaces, inheriting the parent's alignment so text
    // centered by a parent's `alignItems: 'center'` (button labels) or by its
    // own `textAlign` stays put.
    position: 'relative',
  },
  hidden: {
    opacity: 0,
  },
});
