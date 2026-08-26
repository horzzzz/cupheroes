import { useWindowDimensions } from 'react-native';

import { MainScreen } from '@/constants/theme';

/**
 * How far a full-bleed element has to escape the capped content column
 * (`(tabs)/_layout.tsx`) to reach the real screen edges. Zero on phones
 * narrower than the design frame.
 */
export function useSideBleed(): number {
  const { width } = useWindowDimensions();

  return Math.max((width - MainScreen.frameWidth) / 2, 0);
}
