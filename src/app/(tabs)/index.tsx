import { router } from 'expo-router';
import { useState } from 'react';

import { DailyBonusOverlay } from '@/components/daily/daily-bonus-overlay';
import { ChapterHeader } from '@/components/main/chapter-header';
import { FightButton } from '@/components/main/fight-button';
import { HeroShowcase } from '@/components/main/hero-showcase';
import { TopBar } from '@/components/main/top-bar';
import { SettingsModal } from '@/components/menu/settings-modal';
import { GamePressable } from '@/components/ui/game-pressable';
import { ScreenColumn } from '@/components/ui/screen-column';
import { playSfx } from '@/game/audio/engine';
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
            without winning 15 waves. Remove this wrapper to strip.
            `silent` on purpose: a plain tap on the header isn't an action in
            a shipped build, so it must not click as though it were -- only
            the dev long-press that actually does something makes a sound. */}
        <GamePressable
          silent
          onLongPress={
            __DEV__
              ? () => {
                  advanceChapter();
                  playSfx('ui-purchase');
                }
              : undefined
          }
          delayLongPress={600}>
          <ChapterHeader chapter={chapter} />
        </GamePressable>
        <HeroShowcase chapter={chapter} />
        <FightButton onPress={() => router.push('/battle')} />
      </ScreenColumn>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <DailyBonusOverlay visible={dailyVisible} onClose={() => setDailyVisible(false)} />
    </>
  );
}
