/**
 * AppMetrica reporting.
 *
 * Native-only: the module has no web build, so it is required lazily and
 * every call is guarded. Nothing here ever throws into a caller -- analytics
 * must never take a screen down with it.
 *
 * Event catalogue (see the tracking brief):
 *   game     { action: 'start' | 'win' | 'loss' }   -- one game, no `game` param
 *   settings { action: 'open' }
 *   rewarded_ad { action: 'view' | 'reward' | 'error', source }  -- emitted by services/ads.ts
 */

import { Platform } from 'react-native';

type AppMetricaModule = typeof import('@appmetrica/react-native-analytics').default;

// Cup Heroes AppMetrica API key (app com.cupheroes.braveknight).
const API_KEY = '81e0f85a-1dea-448a-8f06-c8adcfa405f7';

let sdk: AppMetricaModule | null = null;
let activated = false;

function loadModule(): AppMetricaModule | null {
  if (Platform.OS === 'web') return null;
  if (sdk) return sdk;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load so Expo Go/web don't crash on import
    sdk = (require('@appmetrica/react-native-analytics') as { default: AppMetricaModule }).default;
    return sdk;
  } catch {
    return null;
  }
}

export function initAnalytics() {
  if (activated) return;
  const module = loadModule();
  if (!module) return;
  try {
    module.activate({
      apiKey: API_KEY,
      sessionTimeout: 60,
      crashReporting: true,
      logs: __DEV__,
      sessionsAutoTracking: true,
      appOpenTrackingEnabled: true,
    });
    activated = true;
  } catch (error) {
    // The native module is missing in Expo Go; the app still has to run.
    if (__DEV__) console.warn('[analytics] AppMetrica unavailable', error);
  }
}

/** Calls into the native reporter, swallowing failures so analytics never breaks the app. */
export function reportEvent(event: string, attributes: Record<string, unknown> = {}) {
  if (!activated || !sdk) {
    if (__DEV__) console.log(`[analytics] (no sdk) ${event}`, attributes);
    return;
  }
  try {
    sdk.reportEvent(event, attributes);
  } catch (error) {
    if (__DEV__) console.warn(`[analytics] failed to report "${event}"`, error);
  }
}
