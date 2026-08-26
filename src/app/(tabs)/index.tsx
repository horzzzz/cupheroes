import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChapterHeader } from '@/components/main/chapter-header';
import { FightButton } from '@/components/main/fight-button';
import { HeroShowcase } from '@/components/main/hero-showcase';
import { TopBar } from '@/components/main/top-bar';
import { SettingsModal } from '@/components/menu/settings-modal';

/**
 * Main hub screen — Figma node 1:26. Buttons are not wired up yet, values
 * are hardcoded. Background, safe area, and the bottom nav live in
 * `(tabs)/_layout.tsx` so they're shared with the shop/upgrades screens.
 */
export default function HomeScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <>
      <View style={{ flex: 1, paddingHorizontal: 15 }}>
        <TopBar
          onOpenSettings={() => setSettingsVisible(true)}
          onOpenWheel={() => router.push('/wheel')}
        />
        <ChapterHeader />
        <HeroShowcase />
        <FightButton />
      </View>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
}
