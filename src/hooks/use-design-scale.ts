import { useWindowDimensions } from 'react-native';

import { DesignFrame } from '@/constants/theme';

/**
 * Maps the 390x844 Figma frame onto the real screen.
 * `sx`/`sy` scale absolute positions along each axis; `s` (the smaller of the
 * two) scales sizes uniformly so images and text don't stretch on other
 * aspect ratios.
 */
export function useDesignScale() {
  const { width, height } = useWindowDimensions();
  const sx = width / DesignFrame.width;
  const sy = height / DesignFrame.height;
  const s = Math.min(sx, sy);
  return { width, height, sx, sy, s };
}
