import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTabTrigger } from 'expo-router/ui';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors, MainScreen } from '@/constants/theme';

const SHOP_ICON = require('@/assets/images/main/button-shop.webp');
const FIGHT_ICON = require('@/assets/images/main/button-fight-small.webp');
const UPGRADES_ICON = require('@/assets/images/main/button-upgrades.webp');

const BUTTON_SIZE = 90;
const PLATFORM_HEIGHT = 90;
// The icon row overlaps the platform strip below it by this many px (i.e.
// the platform's own visible height once the icon row's overlap is cut).
const OVERLAP = 40;

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

function PlatformSegment({ active }: { active: boolean }) {
  if (active) {
    return (
      <View style={{ flex: 1, borderTopWidth: 2, borderTopColor: Colors.white }}>
        <LinearGradient
          colors={[Colors.platformActiveTop, Colors.platformActiveBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        borderTopWidth: 2,
        borderTopColor: 'rgba(255,255,255,0.5)',
        backgroundColor: Colors.darkPanel,
      }}
    />
  );
}

/**
 * Bottom shop/fight/upgrades tab strip with an active-segment platform —
 * Figma nodes 1:31-1:42.
 *
 * Plain flex child at the end of the main column, in the same flow (and
 * same container) as the rest of the screen — not an absolutely positioned
 * overlay computed from its own proportional scale. That mismatch used to
 * let the platform disagree with where the fight button actually landed and
 * overlap it; living in one flow makes that impossible.
 *
 * The icon row is pulled up over the platform with a negative margin (the
 * same trick TopBar uses for the level badge over the progress pill)
 * instead of `position: absolute`.
 *
 * The platform itself ignores the screen's side/bottom margins: it escapes
 * the capped content column's width with a negative horizontal margin, and
 * bleeds its color past the safe area into the home-indicator inset with
 * extra height — both computed here so the rest of the layout (which stays
 * inset, as designed) doesn't need to know about it.
 */
export function BottomNav() {
  const { width } = useWindowDimensions();
  const { bottom: insetBottom } = useSafeAreaInsets();
  const sideBleed = Math.max((width - MainScreen.frameWidth) / 2, 0);
  // Only used to reach `switchTab`/`getTrigger` — the active item itself is
  // looked up per-item below, since the platform segment below the icon row
  // needs every item's focus state, not just this hook's own `name`.
  const { switchTab, getTrigger } = useTabTrigger({ name: 'fight' });

  return (
    <View style={{ marginHorizontal: -sideBleed, marginBottom: -insetBottom }}>
      <View style={{ flexDirection: 'row', zIndex: 2, paddingHorizontal: 20 + sideBleed }}>
        {ITEMS.map((item, index) => (
          <View
            key={item.key}
            style={{
              flex: 1,
              alignItems: index === 0 ? 'flex-start' : index === 2 ? 'flex-end' : 'center',
            }}>
            <Pressable
              style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
              onPress={() => switchTab(item.key, {})}>
              <Image
                source={item.icon}
                style={{ width: '100%', height: '100%' }}
                contentFit="fill"
              />
              <GameText
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  fontFamily: Fonts.titan,
                  fontSize: item.labelSize,
                  color: Colors.white,
                }}>
                {item.label}
              </GameText>
            </Pressable>
          </View>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          zIndex: 1,
          marginTop: -(BUTTON_SIZE - OVERLAP),
          // Extra height (not extra top offset) so the color bleeds past
          // the safe area to the literal screen edge without shifting the
          // icon row above it, which stays anchored to the safe position.
          height: PLATFORM_HEIGHT,
        }}>
        {ITEMS.map((item) => (
          <PlatformSegment key={item.key} active={Boolean(getTrigger(item.key)?.isFocused)} />
        ))}
      </View>
    </View>
  );
}
