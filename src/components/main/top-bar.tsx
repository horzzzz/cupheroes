import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const COIN_ICON = require('@/assets/images/main/icon-coin.webp');
const GEM_ICON = require('@/assets/images/main/icon-gem.webp');
const SETTINGS_ICON = require('@/assets/images/main/icon-settings.webp');
const WHEEL_ICON = require('@/assets/images/main/icon-wheel.webp');
const DAILY_REWARD_ICON = require('@/assets/images/main/icon-daily-reward.webp');
const LEVEL_BADGE = require('@/assets/images/main/icon-level-badge.webp');

// Hardcoded placeholder values — real data wiring comes later.
const COINS = 150;
const GEMS = 12;
const LEVEL_PROGRESS = 0.6;

const PILL_WIDTH = 100;
const PILL_HEIGHT = 36;
const ICON_SIZE = 36;
const LEVEL_BADGE_SIZE = 36;
const PROGRESS_HEIGHT = 30;
const PROGRESS_WIDTH = 192 - LEVEL_BADGE_SIZE / 2 - 18;
const PROGRESS_OVERLAP = 18;

function BalancePill({ icon, value }: { icon: number; value: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: PILL_WIDTH,
        height: PILL_HEIGHT,
        borderRadius: PILL_HEIGHT / 2,
        backgroundColor: Colors.balancePill,
        paddingLeft: 10,
      }}>
      <Image source={icon} style={{ width: 24, height: 24 }} contentFit="contain" />
      <GameText
        style={{ marginLeft: 8, fontFamily: Fonts.nunito, fontSize: 18, color: Colors.white }}>
        {value}
      </GameText>
    </View>
  );
}

type TopBarProps = {
  onOpenSettings?: () => void;
};

export function TopBar({ onOpenSettings }: TopBarProps) {
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
        <Image
          source={WHEEL_ICON}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          contentFit="contain"
        />
        <Image
          source={DAILY_REWARD_ICON}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          contentFit="contain"
        />
      </View>

      <View style={{ gap: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <BalancePill icon={COIN_ICON} value={COINS} />
          <BalancePill icon={GEM_ICON} value={GEMS} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={LEVEL_BADGE}
            style={{ width: LEVEL_BADGE_SIZE, height: LEVEL_BADGE_SIZE, zIndex: 2 }}
            contentFit="contain"
          />
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
                width: `${LEVEL_PROGRESS * 100}%`,
                borderRadius: PROGRESS_HEIGHT / 2,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
