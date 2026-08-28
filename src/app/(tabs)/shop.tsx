import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { SettingsModal } from '@/components/menu/settings-modal';
import { CoinsCard } from '@/components/shop/coins-card';
import { FreeGemsButton } from '@/components/shop/free-gems-button';
import { GemPackGrid } from '@/components/shop/gem-pack-grid';
import { ShopHeading } from '@/components/shop/shop-heading';
import { ScreenColumn } from '@/components/ui/screen-column';
import { ScreenTopBar } from '@/components/ui/screen-top-bar';
import { COINS_PACKS, GEM_PACKS } from '@/constants/economy';
import { useEconomyStore } from '@/game/economy/store';

const HEAD_DIAMONDS = require('@/assets/images/shop/head-diamonds.webp');
const HEAD_COINS = require('@/assets/images/shop/head-coins.webp');

// Gaps between the sections, straight off the Figma frame (node 1:144).
const TOP_BAR_GAP = 50;
const AFTER_DIAMONDS_HEAD = 20;
const AFTER_GRID = 30;
const AFTER_FREE_BUTTON = 40;
const AFTER_COINS_HEAD = 20;
const CARDS_GAP = 10;

/**
 * Shop screen — Figma node 1:144. Background and the bottom nav live in
 * `(tabs)/_layout.tsx`, the capped column and status-bar inset in
 * `ScreenColumn`; the content scrolls because it is taller than the frame
 * (the design already cuts the coin cards off at the bottom).
 *
 * Coin packs spend real wallet gems and grant coins on the spot. Gem packs
 * are real-money IAP with no store SDK yet — `TODO(iap)`. The free-gems
 * button is a rewarded ad — `TODO(ads)`.
 */
export default function ShopScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const gems = useEconomyStore((s) => s.gems);
  const spend = useEconomyStore((s) => s.spend);
  const grant = useEconomyStore((s) => s.grant);

  return (
    <>
      <ScreenColumn>
        <ScreenTopBar onOpenSettings={() => setSettingsVisible(true)} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: TOP_BAR_GAP,
            paddingBottom: 24,
          }}>
          <ShopHeading source={HEAD_DIAMONDS} />
          <GemPackGrid
            packs={GEM_PACKS}
            style={{ marginTop: AFTER_DIAMONDS_HEAD }}
            onSelect={() => {
              // TODO(iap): real-money purchase, no store SDK wired up yet.
            }}
          />
          <FreeGemsButton
            style={{ marginTop: AFTER_GRID }}
            onPress={() => {
              // TODO(ads): watch a rewarded ad, then grant a small gem bundle.
            }}
          />

          <ShopHeading source={HEAD_COINS} style={{ marginTop: AFTER_FREE_BUTTON }} />
          <View style={{ flexDirection: 'row', gap: CARDS_GAP, marginTop: AFTER_COINS_HEAD }}>
            {COINS_PACKS.map((pack) => (
              <CoinsCard
                key={pack.amount}
                pack={pack}
                gems={gems}
                onBuy={() => {
                  if (spend({ gems: pack.price })) grant({ coins: pack.amount });
                }}
              />
            ))}
          </View>
        </ScrollView>
      </ScreenColumn>

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
}
