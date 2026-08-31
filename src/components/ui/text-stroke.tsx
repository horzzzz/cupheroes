import { type ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';

/**
 * The flat black "comic outline" from the Figma designs. React Native's `Text`
 * only carries a single `textShadow`, so a real stroke on every side has to be
 * faked with offset copies of the glyphs drawn underneath the fill.
 */

/** Eight compass directions -- 4 copies leave the diagonals thin and jagged. */
const DIRECTIONS: { x: number; y: number }[] = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
];

export function strokeOffsets(width: number): { x: number; y: number }[] {
  return DIRECTIONS.map((d) => ({ x: d.x * width, y: d.y * width }));
}

/** Default stroke width for a given font size (min 1.5px). */
export function defaultStrokeWidth(fontSize: number | undefined): number {
  return Math.max(1.5, Math.round((fontSize ?? 14) / 11));
}

type OutlineCopiesProps = {
  /** The already-flattened text style shared with the visible glyphs. */
  textStyle: TextStyle | undefined;
  width: number;
  color: string;
  children: ReactNode;
  /** Forwarded so wrapping/truncation matches the visible copy. */
  textProps?: Record<string, unknown>;
};

/**
 * Renders the eight offset black copies that make up the outline. Caller is
 * responsible for placing the visible text on top of these in a
 * `position: 'relative'` container.
 */
export function OutlineCopies({
  textStyle,
  width,
  color,
  children,
  textProps,
}: OutlineCopiesProps) {
  return (
    <>
      {strokeOffsets(width).map((o, i) => (
        <Text
          key={i}
          {...textProps}
          accessible={false}
          importantForAccessibility="no"
          style={[
            textStyle,
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            { color, transform: [{ translateX: o.x }, { translateY: o.y }] },
          ]}>
          {children}
        </Text>
      ))}
    </>
  );
}
