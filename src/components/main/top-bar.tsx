import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { BalancePill } from '@/components/ui/balance-pill';
import { GamePressable } from '@/components/ui/game-pressable';
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

/** Red "ready" dot shared by the wheel and daily-reward icons.
 *
 * Pinned flush to the icon's top-right corner (not overhanging it): the icon
 * column is an `right: 0` absolute overlay, so a negative offset put the dot
 * past the parent's edge where Android clips overflowing children (iOS draws
 * it) -- the badge came out sliced on Android only. */
function ReadyBadge() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF3B30',
        borderWidth: 2,
        borderColor: Colors.white,
      }}
    />
  );
}

export function TopBar({ onOpenSettings, onOpenWheel, onOpenDaily }: TopBarProps) {
  const lastClaimDate = useDailyStore((s) => s.lastClaimDate);
  const claimedDay = useDailyStore((s) => s.claimedDay);
  const dailyReady =
    getDailyStatus({ lastClaimDate, claimedDay }, localDateKey(new Date())).phase === 'ready';

  const lastFreeSpinAt = useEconomyStore((s) => s.lastFreeSpinAt);
  const wheelReady =
    lastFreeSpinAt === null || localDateKey(new Date(lastFreeSpinAt)) !== localDateKey(new Date());

  const coins = useEconomyStore((s) => s.coins);
  const gems = useEconomyStore((s) => s.gems);
  const xp = useEconomyStore((s) => s.xp);
  const { level, progress } = levelFromXp(xp);

  // The three action icons are an absolute overlay pinned to the right, but
  // they run taller than the balance/level rows in flow beside them --
  // reserve that height so the last icon (daily reward) isn't left
  // overflowing the header's box, where a sibling below (e.g. the hub's
  // dev long-press wrapper) can sit on top of it and eat its taps.
  const ICON_STACK_HEIGHT = ICON_SIZE * 3 + 20 * 2;

  return (
    <View style={{ minHeight: ICON_STACK_HEIGHT }}>
      <View style={{ position: 'absolute', right: 0, gap: 20 }}>
        <GamePressable onPress={onOpenSettings}>
          <Image
            source={SETTINGS_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
        </GamePressable>
        <GamePressable onPress={onOpenWheel}>
          <Image
            source={WHEEL_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
          {wheelReady && <ReadyBadge />}
        </GamePressable>
        <GamePressable onPress={onOpenDaily}>
          <Image
            source={DAILY_REWARD_ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
          {dailyReady && <ReadyBadge />}
        </GamePressable>
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
