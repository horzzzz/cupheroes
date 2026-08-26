import { router } from 'expo-router';
import { useState } from 'react';

import { ChapterHeader } from '@/components/main/chapter-header';
import { FightButton } from '@/components/main/fight-button';
import { HeroShowcase } from '@/components/main/hero-showcase';
import { TopBar } from '@/components/main/top-bar';
import { SettingsModal } from '@/components/menu/settings-modal';
import { ScreenColumn } from '@/components/ui/screen-column';

/**
 * Main hub screen — Figma node 1:26. Buttons are not wired up yet, values
 * are hardcoded. Background and the bottom nav live in `(tabs)/_layout.tsx`
 * so they're shared with the shop/upgrades screens; `ScreenColumn` caps the
 * content and clears the status bar.
 */
export default function HomeScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <>
      <ScreenColumn style={{ paddingHorizontal: 15 }}>
        <TopBar
          onOpenSettings={() => setSettingsVisible(true)}
          onOpenWheel={() => router.push('/wheel')}
        />
        <ChapterHeader />
        <HeroShowcase />
        <FightButton />
      </ScreenColumn>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
}
