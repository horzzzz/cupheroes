import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { BalancePill } from '@/components/ui/balance-pill';

const COIN_ICON = require('@/assets/images/main/icon-coin.webp');
const GEM_ICON = require('@/assets/images/main/icon-gem.webp');
const SETTINGS_ICON = require('@/assets/images/main/icon-settings.webp');

const ICON_SIZE = 36;
/** Gap from the balance row down to whatever a screen puts under it. */
const CHILDREN_GAP = 20;

type ScreenTopBarProps = {
  coins: number;
  gems: number;
  onOpenSettings?: () => void;
  /** Extra HUD under the balance row — the upgrades screen's level bar. */
  children?: ReactNode;
};

/**
 * Balance pills plus settings, shared by the shop (Figma nodes 1:183/1:190/
 * 1:179) and upgrades (1:1143/1:1150/1:1139) screens. Unlike the hub's
 * `TopBar` there is no wheel/daily-reward column.
 */
export function ScreenTopBar({ coins, gems, onOpenSettings, children }: ScreenTopBarProps) {
  return (
    <View style={{ paddingHorizontal: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <BalancePill icon={COIN_ICON} value={coins} />
        <BalancePill icon={GEM_ICON} value={gems} />

        <Pressable style={{ marginLeft: 'auto' }} onPress={onOpenSettings}>
          <Image
            source={SETTINGS_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
        </Pressable>
      </View>

      {children ? <View style={{ marginTop: CHILDREN_GAP }}>{children}</View> : null}
    </View>
  );
}
