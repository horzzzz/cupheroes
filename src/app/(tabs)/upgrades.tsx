import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsModal } from '@/components/menu/settings-modal';
import { ScreenTopBar } from '@/components/ui/screen-top-bar';
import { LevelProgress } from '@/components/upgrades/level-progress';
import { UpgradeLadder } from '@/components/upgrades/upgrade-ladder';
import { MainScreen } from '@/constants/theme';

// Hardcoded placeholder values — real data wiring comes later.
const COINS = 150;
const GEMS = 12;
const PLAYER_LEVEL = 1;
const PLAYER_LEVEL_PROGRESS = 0.61;
const UNLOCKED_UPGRADE_LEVELS = 1;

// Vignette over the top of the ladder — Figma node 1:1126, less the 30pt the
// design spends above the balance row (the status bar inset covers that).
const SCRIM_HEIGHT = 219;
const SCRIM_COLOR = 'rgba(25,0,137,0.78)';

/**
 * Upgrades screen — Figma node 1:1102. A 100-level ladder of attack/health/
 * defence nodes, virtualised because it is 300 rungs long; purchases aren't
 * wired up yet. The background and the bottom nav live in
 * `(tabs)/_layout.tsx`.
 *
 * Unlike the hub and shop this screen does not use `ScreenColumn`: the ladder
 * runs the full width and up behind the status bar, so its locked-stretch
 * tint and the fence reach every screen edge. Only the HUD is capped and
 * pushed down past the notch.
 */
export default function UpgradesScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={{ flex: 1 }}>
        <UpgradeLadder unlockedLevels={UNLOCKED_UPGRADE_LEVELS} coins={COINS} />

        <LinearGradient
          colors={[SCRIM_COLOR, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: SCRIM_HEIGHT + insets.top,
          }}
          pointerEvents="none"
        />

        <View
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}>
          <View style={{ width: '100%', maxWidth: MainScreen.frameWidth }}>
            <ScreenTopBar
              coins={COINS}
              gems={GEMS}
              onOpenSettings={() => setSettingsVisible(true)}>
              <LevelProgress level={PLAYER_LEVEL} progress={PLAYER_LEVEL_PROGRESS} />
            </ScreenTopBar>
          </View>
        </View>
      </View>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
}
