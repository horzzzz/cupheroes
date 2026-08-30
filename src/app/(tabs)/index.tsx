import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { DailyBonusOverlay } from '@/components/daily/daily-bonus-overlay';
import { ChapterHeader } from '@/components/main/chapter-header';
import { FightButton } from '@/components/main/fight-button';
import { HeroShowcase } from '@/components/main/hero-showcase';
import { TopBar } from '@/components/main/top-bar';
import { SettingsModal } from '@/components/menu/settings-modal';
import { ScreenColumn } from '@/components/ui/screen-column';
import { useEconomyStore } from '@/game/economy/store';

/**
 * Main hub screen — Figma node 1:26. Background and the bottom nav live in
 * `(tabs)/_layout.tsx` so they're shared with the shop/upgrades screens;
 * `ScreenColumn` caps the content and clears the status bar.
 */
export default function HomeScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [dailyVisible, setDailyVisible] = useState(false);
  const chapter = useEconomyStore((s) => s.chapter);
  const advanceChapter = useEconomyStore((s) => s.advanceChapter);

  return (
    <>
      <ScreenColumn style={{ paddingHorizontal: 15 }}>
        <TopBar
          onOpenSettings={() => setSettingsVisible(true)}
          onOpenWheel={() => router.push('/wheel')}
          onOpenDaily={() => setDailyVisible(true)}
        />
        {/* DEV ONLY: long-press the chapter title to jump ahead a chapter
            without winning 15 waves. Remove this Pressable wrapper to strip. */}
        <Pressable onLongPress={__DEV__ ? advanceChapter : undefined} delayLongPress={600}>
          <ChapterHeader chapter={chapter} />
        </Pressable>
        <HeroShowcase chapter={chapter} />
        <FightButton onPress={() => router.push('/battle')} />
      </ScreenColumn>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <DailyBonusOverlay visible={dailyVisible} onClose={() => setDailyVisible(false)} />
    </>
  );
}
