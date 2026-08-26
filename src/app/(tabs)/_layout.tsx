import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/main/bottom-nav';
import { MainBackground } from '@/components/main/main-background';
import { MainScreen } from '@/constants/theme';

/**
 * Shared shell for the tabbed app screens (hub/shop/upgrades) — background,
 * bottom safe area, and the bottom nav live here so they persist across
 * screens instead of remounting per-route.
 *
 * Screens get the full window width and are free to run under the status
 * bar: the slot is rendered by react-native-screens, which clips to its own
 * bounds, so anything the shell reserved here would be unreachable from a
 * screen that needs to paint edge to edge (the upgrades ladder does). Screens
 * that want the old capped, status-bar-clearing column wrap themselves in
 * `ScreenColumn`; only the nav keeps its column here, because its bleed math
 * is written against it.
 *
 * Uses expo-router's headless Tabs (`expo-router/ui`) rather than the
 * built-in `<Tabs>` navigator: that renders its tab bar in its own
 * full-width container outside our capped column, which would break the
 * bleed/inset math `BottomNav` relies on (see its file for why it can't be
 * `position: absolute` either). Headless tabs let `BottomNav` keep living
 * as a plain flex child in this column, unchanged.
 */
export default function TabsLayout() {
  return (
    <Tabs style={{ flex: 1 }}>
      <MainBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <TabSlot style={{ flex: 1 }} />
        <View style={{ width: '100%', maxWidth: MainScreen.frameWidth, alignSelf: 'center' }}>
          <BottomNav />
        </View>
      </SafeAreaView>

      {/* Declares the tab routes; BottomNav renders the actual bar. */}
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="shop" href="/shop" />
        <TabTrigger name="fight" href="/" />
        <TabTrigger name="upgrades" href="/upgrades" />
      </TabList>
    </Tabs>
  );
}
