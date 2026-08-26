import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/main/bottom-nav';
import { ChapterHeader } from '@/components/main/chapter-header';
import { FightButton } from '@/components/main/fight-button';
import { HeroShowcase } from '@/components/main/hero-showcase';
import { MainBackground } from '@/components/main/main-background';
import { TopBar } from '@/components/main/top-bar';
import { SettingsModal } from '@/components/menu/settings-modal';
import { MainScreen } from '@/constants/theme';

/** Main hub screen — Figma node 1:26. Buttons are not wired up yet, values are hardcoded. */
export default function HomeScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <>
      <MainBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, width: '100%', maxWidth: MainScreen.frameWidth, alignSelf: 'center' }}>
          <View style={{ flex: 1, paddingHorizontal: 15 }}>
            <TopBar onOpenSettings={() => setSettingsVisible(true)} />
            <ChapterHeader />
            <HeroShowcase />
            <FightButton />
          </View>
            <BottomNav />
        </View>
      </SafeAreaView>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
}
