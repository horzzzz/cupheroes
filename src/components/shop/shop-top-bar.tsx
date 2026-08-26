import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { BalancePill } from '@/components/ui/balance-pill';

const COIN_ICON = require('@/assets/images/main/icon-coin.webp');
const GEM_ICON = require('@/assets/images/main/icon-gem.webp');
const SETTINGS_ICON = require('@/assets/images/main/icon-settings.webp');

const ICON_SIZE = 36;

type ShopTopBarProps = {
  coins: number;
  gems: number;
  onOpenSettings?: () => void;
};

/**
 * Shop header — Figma nodes 1:183/1:190/1:179. Same balance pills as the hub's
 * `TopBar`, but without the level bar and with settings as the only side icon.
 */
export function ShopTopBar({ coins, gems, onOpenSettings }: ShopTopBarProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 }}>
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
  );
}
