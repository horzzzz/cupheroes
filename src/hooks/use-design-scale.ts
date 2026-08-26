import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesignFrame } from '@/constants/theme';

/**
 * Maps the 390x844 Figma frame onto the real screen.
 *
 * The Figma frames are drawn edge-to-edge with no notch/status-bar or
 * home-indicator awareness, so this hook exposes two coordinate systems:
 * - `sx`/`sy`/`s` — the *safe* mapping, scaled to fit the space between the
 *   status bar and home indicator. Foreground UI (buttons, text, icons)
 *   should use these while sitting inside a `SafeAreaView` (see
 *   `src/app/index.tsx`) so the OS handles the actual top/bottom offset —
 *   positions here are relative to the safe area's top-left, not the
 *   screen's.
 * - `rawSy`/`rawS` — the old edge-to-edge mapping, for full-bleed
 *   backgrounds that must still extend behind the status bar/home indicator.
 */
export function useDesignScale() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const safeHeight = Math.max(height - insets.top - insets.bottom, 1);

  const sx = width / DesignFrame.width;
  const sy = safeHeight / DesignFrame.height;
  const s = Math.min(sx, sy);

  const rawSy = height / DesignFrame.height;
  const rawS = Math.min(sx, rawSy);

  return { width, height, sx, sy, s, rawSy, rawS, insetBottom: insets.bottom };
}
