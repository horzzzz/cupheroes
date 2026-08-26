import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { SettingsModal } from '@/components/menu/settings-modal';
import { CoinsCard, type CoinsPack } from '@/components/shop/coins-card';
import { FreeGemsButton } from '@/components/shop/free-gems-button';
import { GemPackGrid, type GemPackItem } from '@/components/shop/gem-pack-grid';
import { ShopHeading } from '@/components/shop/shop-heading';
import { ShopTopBar } from '@/components/shop/shop-top-bar';

const HEAD_DIAMONDS = require('@/assets/images/shop/head-diamonds.webp');
const HEAD_COINS = require('@/assets/images/shop/head-coins.webp');

// Hardcoded placeholder values — real data wiring comes later.
const COINS = 150;
const GEMS = 18;

const GEM_PACKS: readonly GemPackItem[] = [
  { amount: 15, art: require('@/assets/images/shop/gem-pack-1.webp') },
  { amount: 20, art: require('@/assets/images/shop/gem-pack-2.webp') },
  { amount: 30, art: require('@/assets/images/shop/gem-pack-3.webp') },
  { amount: 45, art: require('@/assets/images/shop/gem-pack-4.webp'), locked: true },
];

const COINS_PACKS: readonly CoinsPack[] = [
  { amount: 60, price: 18, art: require('@/assets/images/shop/card-coins-1.webp') },
  { amount: 181, price: 54, art: require('@/assets/images/shop/card-coins-2.webp') },
  { amount: 721, price: 216, art: require('@/assets/images/shop/card-coins-3.webp') },
];

// Gaps between the sections, straight off the Figma frame (node 1:144).
const TOP_BAR_GAP = 50;
const AFTER_DIAMONDS_HEAD = 20;
const AFTER_GRID = 30;
const AFTER_FREE_BUTTON = 40;
const AFTER_COINS_HEAD = 20;
const CARDS_GAP = 10;

/**
 * Shop screen — Figma node 1:144. Purchases aren't wired up yet, values are
 * hardcoded. Background, safe area, and the bottom nav live in
 * `(tabs)/_layout.tsx`; the content scrolls because it is taller than the
 * frame (the design already cuts the coin cards off at the bottom).
 */
export default function ShopScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <>
      <View style={{ flex: 1 }}>
        <ShopTopBar coins={COINS} gems={GEMS} onOpenSettings={() => setSettingsVisible(true)} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: TOP_BAR_GAP,
            paddingBottom: 24,
          }}>
          <ShopHeading source={HEAD_DIAMONDS} />
          <GemPackGrid packs={GEM_PACKS} style={{ marginTop: AFTER_DIAMONDS_HEAD }} />
          <FreeGemsButton style={{ marginTop: AFTER_GRID }} />

          <ShopHeading source={HEAD_COINS} style={{ marginTop: AFTER_FREE_BUTTON }} />
          <View style={{ flexDirection: 'row', gap: CARDS_GAP, marginTop: AFTER_COINS_HEAD }}>
            {COINS_PACKS.map((pack) => (
              <CoinsCard key={pack.amount} pack={pack} gems={GEMS} />
            ))}
          </View>
        </ScrollView>
      </View>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
}
