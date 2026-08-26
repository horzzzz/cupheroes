import { Image } from 'expo-image';
import { type ImageStyle, type StyleProp } from 'react-native';

const WIDTH = 300;
const HEIGHT = 100;

/**
 * Ribbon section title — Figma nodes 1:148 ("DIAMONDS") and 1:153 ("COINS").
 * The wording is part of the artwork, like the wheel screen's banner.
 */
export function ShopHeading({ source, style }: { source: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image source={source} style={[{ width: WIDTH, height: HEIGHT }, style]} contentFit="contain" />
  );
}
