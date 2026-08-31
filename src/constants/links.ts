/** External legal pages, linked from the start screen and the settings menu. */

import { Linking } from 'react-native';

export const TERMS_URL = 'https://telegra.ph/TERMS-OF-USE-08-31';
export const PRIVACY_URL = 'https://telegra.ph/PRIVACY-POLICY-08-31-113';

export function openTerms(): void {
  Linking.openURL(TERMS_URL).catch(() => {});
}

export function openPrivacy(): void {
  Linking.openURL(PRIVACY_URL).catch(() => {});
}
