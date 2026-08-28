import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { BalancePill } from '@/components/ui/balance-pill';
import { LevelBadge } from '@/components/upgrades/level-badge';
import { Colors } from '@/constants/theme';
import { localDateKey } from '@/game/daily/rewards';
import { getDailyStatus, useDailyStore } from '@/game/daily/store';
import { levelFromXp } from '@/game/economy/level';
import { useEconomyStore } from '@/game/economy/store';

const COIN_ICON = require('@/assets/images/main/icon-coin.webp');
const GEM_ICON = require('@/assets/images/main/icon-gem.webp');
const SETTINGS_ICON = require('@/assets/images/main/icon-settings.webp');
const WHEEL_ICON = require('@/assets/images/main/icon-wheel.webp');
const DAILY_REWARD_ICON = require('@/assets/images/main/icon-daily-reward.webp');

const ICON_SIZE = 36;
const LEVEL_BADGE_SIZE = 36;
const PROGRESS_HEIGHT = 30;
const PROGRESS_WIDTH = 192 - LEVEL_BADGE_SIZE / 2 - 18;
const PROGRESS_OVERLAP = 18;

type TopBarProps = {
  onOpenSettings?: () => void;
  onOpenWheel?: () => void;
  onOpenDaily?: () => void;
};

export function TopBar({ onOpenSettings, onOpenWheel, onOpenDaily }: TopBarProps) {
  const lastClaimDate = useDailyStore((s) => s.lastClaimDate);
  const claimedDay = useDailyStore((s) => s.claimedDay);
  const dailyReady =
    getDailyStatus({ lastClaimDate, claimedDay }, localDateKey(new Date())).phase === 'ready';

  const coins = useEconomyStore((s) => s.coins);
  const gems = useEconomyStore((s) => s.gems);
  const xp = useEconomyStore((s) => s.xp);
  const { level, progress } = levelFromXp(xp);

  return (
    <View>
      <View style={{ position: 'absolute', right: 0, gap: 20 }}>
        <Pressable onPress={onOpenSettings}>
          <Image
            source={SETTINGS_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
        </Pressable>
        <Pressable onPress={onOpenWheel}>
          <Image
            source={WHEEL_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
        </Pressable>
        <Pressable onPress={onOpenDaily}>
          <Image
            source={DAILY_REWARD_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
          {dailyReady && (
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#FF3B30',
                borderWidth: 2,
                borderColor: Colors.white,
              }}
            />
          )}
        </Pressable>
      </View>

      <View style={{ gap: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <BalancePill icon={COIN_ICON} value={coins} />
          <BalancePill icon={GEM_ICON} value={gems} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LevelBadge level={level} size={LEVEL_BADGE_SIZE} style={{ zIndex: 2 }} />
          <View
            style={{
              marginLeft: -PROGRESS_OVERLAP,
              zIndex: 1,
              width: PROGRESS_WIDTH,
              height: PROGRESS_HEIGHT,
              borderRadius: PROGRESS_HEIGHT / 2,
              backgroundColor: Colors.darkPanel,
              opacity: 0.65,
              overflow: 'hidden',
            }}>
            <LinearGradient
              colors={[Colors.progressGreenStart, Colors.progressGreenEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress * 100}%`,
                borderRadius: PROGRESS_HEIGHT / 2,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
