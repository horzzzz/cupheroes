/**
 * Game color palette and design-frame constants for Cup Heroes: Brave Knight.
 * The screens are built against a 390x844 Figma frame and scaled to fit real devices.
 */

export const Colors = {
  gradientStart: '#FACD04',
  gradientEnd: '#FC8B02',
  trackBackground: '#250404',
  screenBackground: '#050b0d',
  white: '#ffffff',

  darkPanel: '#250404',
  balancePill: 'rgba(37,4,4,0.65)',
  platformActiveTop: '#FCCE02',
  platformActiveBottom: '#E66C02',
  progressGreenStart: '#00B215',
  progressGreenEnd: '#5AFC02',
} as const;

export const DesignFrame = {
  width: 390,
  height: 844,
} as const;

/** Caps and centers the main screen's content column on wide screens/tablets. */
export const MainScreen = {
  frameWidth: 430,
} as const;
