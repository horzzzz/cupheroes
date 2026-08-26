import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDesignScale } from '@/hooks/use-design-scale';

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

const PILL_TOP = 30;
const PILL_HEIGHT = 36;
const PILL_WIDTH = 100;
const COINS_LEFT = 15;
const GEMS_LEFT = 125;

const ICON_COLUMN_LEFT = 339;
const SETTINGS_TOP = 30;
const WHEEL_TOP = 86;
const DAILY_REWARD_TOP = 142;
const ICON_SIZE = 36;

const LEVEL_ROW_TOP = 86;
const LEVEL_ROW_LEFT = 15;
const LEVEL_BADGE_SIZE = 36;
const PROGRESS_HEIGHT = 30;
const PROGRESS_WIDTH = 192;
const PROGRESS_OVERLAP = 18;

function BalancePill({
  icon,
  value,
  left,
  sx,
  sy,
  s,
}: {
  icon: number;
  value: number;
  left: number;
  sx: number;
  sy: number;
  s: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: left * sx,
        top: PILL_TOP * sy,
        width: PILL_WIDTH * s,
        height: PILL_HEIGHT * s,
        borderRadius: (PILL_HEIGHT / 2) * s,
        backgroundColor: Colors.balancePill,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10 * s,
      }}>
      <Image source={icon} style={{ width: 24 * s, height: 24 * s }} contentFit="contain" />
      <GameText
        style={{
          marginLeft: 8 * s,
          fontFamily: Fonts.nunito,
          fontSize: 18 * s,
          color: Colors.white,
        }}>
        {value}
      </GameText>
    </View>
  );
}

/**
 * Coins/gems balances, settings/wheel/daily-reward icons, level badge —
 * Figma nodes 1:43-1:81. Positions are relative to the parent SafeAreaView's
 * top edge (see src/app/index.tsx), so no manual inset math is needed here.
 */
export function TopBar() {
  const { sx, sy, s } = useDesignScale();

  return (
    <View>
      <BalancePill icon={COIN_ICON} value={COINS} left={COINS_LEFT} sx={sx} sy={sy} s={s} />
      <BalancePill icon={GEM_ICON} value={GEMS} left={GEMS_LEFT} sx={sx} sy={sy} s={s} />

      <Image
        source={SETTINGS_ICON}
        style={{
          position: 'absolute',
          left: ICON_COLUMN_LEFT * sx,
          top: SETTINGS_TOP * sy,
          width: ICON_SIZE * s,
          height: ICON_SIZE * s,
        }}
        contentFit="contain"
      />
      <Image
        source={WHEEL_ICON}
        style={{
          position: 'absolute',
          left: ICON_COLUMN_LEFT * sx,
          top: WHEEL_TOP * sy,
          width: ICON_SIZE * s,
          height: ICON_SIZE * s,
        }}
        contentFit="contain"
      />
      <Image
        source={DAILY_REWARD_ICON}
        style={{
          position: 'absolute',
          left: ICON_COLUMN_LEFT * sx,
          top: DAILY_REWARD_TOP * sy,
          width: ICON_SIZE * s,
          height: ICON_SIZE * s,
        }}
        contentFit="contain"
      />

      <View
        style={{
          position: 'absolute',
          left: (LEVEL_ROW_LEFT + LEVEL_BADGE_SIZE / 2 - PROGRESS_OVERLAP) * sx,
          top: LEVEL_ROW_TOP * sy + (LEVEL_BADGE_SIZE * s - PROGRESS_HEIGHT * s) / 2,
          width: PROGRESS_WIDTH * s,
          height: PROGRESS_HEIGHT * s,
          borderRadius: (PROGRESS_HEIGHT / 2) * s,
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
            borderRadius: (PROGRESS_HEIGHT / 2) * s,
          }}
        />
      </View>

      <Image
        source={LEVEL_BADGE}
        style={{
          position: 'absolute',
          left: LEVEL_ROW_LEFT * sx,
          top: LEVEL_ROW_TOP * sy,
          width: LEVEL_BADGE_SIZE * s,
          height: LEVEL_BADGE_SIZE * s,
        }}
        contentFit="contain"
      />
    </View>
  );
}
