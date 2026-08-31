import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

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

// Layout/box props are hoisted onto the wrapper <View> so it stands exactly
// where a bare <Text> would have; the glyph copies inside it are laid out
// plainly (relative flow) so they always line up with each other.
const BOX_KEYS = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'start',
  'end',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'alignSelf',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'zIndex',
  'transform',
  'opacity',
] as const;

function splitStyle(flat: TextStyle | undefined): { box: ViewStyle; text: TextStyle } {
  const box: Record<string, unknown> = {};
  const text: Record<string, unknown> = { ...(flat ?? {}) };
  for (const key of BOX_KEYS) {
    if (key in text) {
      box[key] = text[key];
      delete text[key];
    }
  }
  return { box: box as ViewStyle, text: text as TextStyle };
}

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
    const { box, text } = splitStyle(flattened);
    // A hidden in-flow copy gives the wrapper the text's exact size; the
    // MaskedView (and the outline copies) then fill that box.
    return (
      <View style={[styles.wrap, box]} pointerEvents="box-none">
        {hasOutline && (
          <View style={styles.fill} pointerEvents="none">
            <OutlineCopies textStyle={text} width={strokeWidth} color={outlineColor}>
              {children}
            </OutlineCopies>
          </View>
        )}
        <MaskedView
          style={styles.fill}
          maskElement={
            <Text style={text} {...rest}>
              {children}
            </Text>
          }>
          <Text style={[text, styles.hidden]} {...rest}>
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
        <Text style={[text, styles.hidden]} {...rest}>
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

  const { box, text } = splitStyle(flattened);
  return (
    <View style={[styles.wrap, box]} pointerEvents="box-none">
      <OutlineCopies textStyle={text} width={strokeWidth} color={outlineColor}>
        {children}
      </OutlineCopies>
      <Text style={text} {...rest}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Positioned so the absolute outline copies anchor to it; otherwise it
    // behaves like the bare <Text> it replaces and inherits the parent's
    // alignment (button labels centered by `alignItems: 'center'`, etc.).
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    opacity: 0,
  },
});
