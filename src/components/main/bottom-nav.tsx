import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDesignScale } from '@/hooks/use-design-scale';

const SHOP_ICON = require('@/assets/images/main/button-shop.webp');
const FIGHT_ICON = require('@/assets/images/main/button-fight-small.webp');
const UPGRADES_ICON = require('@/assets/images/main/button-upgrades.webp');

const PLATFORM_TOP = 754;
const PLATFORM_HEIGHT = 90;
const SEGMENT_WIDTH = 130;

const BUTTON_TOP = 714;
const BUTTON_SIZE = 90;
const BUTTON_LEFTS = [20, 150, 280];

type NavItem = {
  key: string;
  icon: number;
  label: string;
  labelSize: number;
};

const ITEMS: NavItem[] = [
  { key: 'shop', icon: SHOP_ICON, label: 'SHOP', labelSize: 18 },
  { key: 'fight', icon: FIGHT_ICON, label: 'FIGHT', labelSize: 18 },
  { key: 'upgrades', icon: UPGRADES_ICON, label: 'UPGRADES', labelSize: 15 },
];

/** Bottom shop/fight/upgrades tab strip with an active-segment platform — Figma nodes 1:31-1:42. */
export function BottomNav() {
  const { sx, sy, s, insetBottom } = useDesignScale();

  return (
    <View>
      {/* The platform's design bottom edge (y=844) is the device's literal
          bottom edge, so its color should bleed under the home indicator
          instead of stopping at the SafeAreaView's padded edge. The
          interactive buttons below stay within the safe area. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: PLATFORM_TOP * sy + insetBottom,
          right: 0,
          height: PLATFORM_HEIGHT * s,
          flexDirection: 'row',
        }}>
        <View
          style={{
            width: SEGMENT_WIDTH * sx,
            height: '100%',
            backgroundColor: Colors.darkPanel,
            borderTopWidth: 2,
            borderTopColor: 'rgba(255,255,255,0.5)',
          }}
        />
        <LinearGradient
          colors={[Colors.platformActiveTop, Colors.platformActiveBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: SEGMENT_WIDTH * sx,
            height: '100%',
            borderTopWidth: 2,
            borderTopColor: Colors.white,
          }}
        />
        <View
          style={{
            width: SEGMENT_WIDTH * sx,
            height: '100%',
            backgroundColor: Colors.darkPanel,
            borderTopWidth: 2,
            borderTopColor: 'rgba(255,255,255,0.5)',
          }}
        />
      </View>

      {ITEMS.map((item, index) => (
        <Pressable
          key={item.key}
          style={{
            position: 'absolute',
            left: BUTTON_LEFTS[index] * sx,
            top: BUTTON_TOP * sy + insetBottom,
            width: BUTTON_SIZE * s,
            height: BUTTON_SIZE * s,
          }}>
          <Image source={item.icon} style={{ width: '100%', height: '100%' }} contentFit="fill" />
          <GameText
            style={{
              position: 'absolute',
              bottom: 12 * s,
              left: 0,
              right: 0,
              textAlign: 'center',
              textTransform: 'uppercase',
              fontFamily: Fonts.titan,
              fontSize: item.labelSize * s,
              color: Colors.white,
            }}>
            {item.label}
          </GameText>
        </Pressable>
      ))}
    </View>
  );
}
