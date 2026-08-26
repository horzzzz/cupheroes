import { Image } from 'expo-image';

const HEAD_BANNER = require('@/assets/images/wheel/head-banner.webp');

const BANNER_WIDTH = 298;
const BANNER_HEIGHT = 98;

/** Ribbon title of the wheel screen — Figma node 1:275, "WHEEL OF LUCK" baked into the artwork. */
export function WheelHeader() {
  return (
    <Image
      source={HEAD_BANNER}
      style={{ alignSelf: 'center', width: BANNER_WIDTH, height: BANNER_HEIGHT }}
      contentFit="contain"
    />
  );
}
