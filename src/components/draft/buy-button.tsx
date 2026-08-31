import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';

const PILL = require('@/assets/images/shop/button-pill-blue.webp');
const BALL = require('@/assets/images/battle/icon-ball.webp');
const AD = require('@/assets/images/ui/icon-ad.webp');

const W = 100;
const H = 39;

/**
 * The pill under a draft card (Figma component 1:2519).
 * - `buy`: ball icon + price, or "FREE" when the price is 0. Price turns red
 *   when the player can't afford it -- an `ad` button then appears beside it.
 * - `ad`: watch-an-ad alternative. No SDK yet, so `onPress` is wired but the
 *   caller passes a no-op with a TODO -- kept in the layout per the design.
 */
export function BuyButton({
  variant,
  price = 0,
  affordable = true,
  scale,
  onPress,
}: {
  variant: 'buy' | 'ad';
  price?: number;
  affordable?: boolean;
  scale: number;
  onPress: () => void;
}) {
  const free = variant === 'buy' && price === 0;

  return (
    <GamePressable
      onPress={onPress}
      // An unaffordable buy pill is already a no-op at the caller; saying so
      // here is what gets it the rejection blip instead of a click that
      // pretends something happened. The `ad` variant is always live.
      disabled={variant === 'buy' && !affordable}
      style={{ width: W * scale, height: H * scale }}
      hitSlop={6}>
      <Image source={PILL} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5 * scale,
        }}>
        {variant === 'ad' && (
          <Image source={AD} style={{ width: 22 * scale, height: 22 * scale }} contentFit="contain" />
        )}
        {variant === 'buy' && !free && (
          <Image source={BALL} style={{ width: 22 * scale, height: 22 * scale }} contentFit="contain" />
        )}
        <GameText
          style={{
            fontFamily: Fonts.titan,
            fontSize: 18 * scale,
            textTransform: 'uppercase',
            color: variant === 'buy' && !affordable ? '#ff4e4e' : '#ffffff',
          }}>
          {variant === 'ad' || free ? 'Free' : String(price)}
        </GameText>
      </View>
    </GamePressable>
  );
}
