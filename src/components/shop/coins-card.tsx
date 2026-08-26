import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const GEM_ICON = require('@/assets/images/main/icon-gem.webp');
const PILL_ASSET = require('@/assets/images/shop/button-pill-blue.webp');

const WIDTH = 110;
const HEIGHT = 182;
const BORDER = 1;
// Children are laid out in the design's card coordinates; absolute positions
// inside a bordered View start at the padding box, hence the -BORDER.
const inset = (value: number) => value - BORDER;

const PANEL_INSET = 2;
const PANEL_WIDTH = 106;
const PANEL_HEIGHT = 175;
const ART_WIDTH = 100;
const ART_HEIGHT = 92;
const AMOUNT_CENTER_Y = 94.5;
const AMOUNT_BOX_HEIGHT = 30;
const BUTTON_TOP = 128;
const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 39;
const PRICE_ROW_TOP = 6;

const CARD_BACKGROUND = '#0a3061';
const PANEL_TOP_GREEN = '#00883d';
const PANEL_MID_GREEN = '#09bd00';
const PANEL_BOTTOM_GREEN = '#9aff5c';
const PANEL_GLOW = '#ffd52c';
const PRICE_UNAFFORDABLE = '#ff4e4e';

export type CoinsPack = {
  amount: number;
  price: number;
  art: number;
};

type CoinsCardProps = {
  pack: CoinsPack;
  /** Gem balance — the price turns red when the player can't cover it. */
  gems: number;
  onBuy?: () => void;
};

/** Coin bundle tile — Figma component `coins_card` (nodes 1:176-1:178). */
export function CoinsCard({ pack, gems, onBuy }: CoinsCardProps) {
  const [pressed, setPressed] = useState(false);
  const affordable = gems >= pack.price;

  return (
    <View
      style={{
        width: WIDTH,
        height: HEIGHT,
        borderRadius: 10,
        borderWidth: BORDER,
        borderColor: Colors.darkPanel,
        backgroundColor: CARD_BACKGROUND,
      }}>
      <LinearGradient
        colors={[PANEL_TOP_GREEN, PANEL_MID_GREEN, PANEL_BOTTOM_GREEN]}
        locations={[0, 0.77885, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: inset(PANEL_INSET),
          top: inset(PANEL_INSET),
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
          borderRadius: 8,
          boxShadow: `inset 0px 0px 7.1px ${PANEL_GLOW}`,
        }}
      />

      <Image
        source={pack.art}
        style={{
          position: 'absolute',
          left: inset(PANEL_INSET + (PANEL_WIDTH - ART_WIDTH) / 2),
          top: inset(PANEL_INSET + (PANEL_WIDTH - ART_HEIGHT) / 2),
          width: ART_WIDTH,
          height: ART_HEIGHT,
        }}
        contentFit="contain"
      />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: inset(AMOUNT_CENTER_Y - AMOUNT_BOX_HEIGHT / 2),
          height: AMOUNT_BOX_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none">
        <GameText style={{ fontFamily: Fonts.titan, fontSize: 24, color: Colors.white }}>
          {pack.amount}
        </GameText>
      </View>

      <Pressable
        onPress={onBuy}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          position: 'absolute',
          left: inset((WIDTH - BUTTON_WIDTH) / 2),
          top: inset(BUTTON_TOP),
          width: BUTTON_WIDTH,
          height: BUTTON_HEIGHT,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        }}>
        <Image source={PILL_ASSET} style={StyleSheet.absoluteFill} contentFit="fill" />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: PRICE_ROW_TOP,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
          pointerEvents="none">
          <Image source={GEM_ICON} style={{ width: 24, height: 24 }} contentFit="contain" />
          <GameText
            style={{
              fontFamily: Fonts.titan,
              fontSize: 18,
              color: affordable ? Colors.white : PRICE_UNAFFORDABLE,
            }}>
            {pack.price}
          </GameText>
        </View>
      </Pressable>
    </View>
  );
}
