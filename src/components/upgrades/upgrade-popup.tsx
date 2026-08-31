import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { UPGRADE_LABELS, type UpgradeStep } from '@/constants/upgrades';
import { formatCompact } from '@/utils/format-number';

const COIN_ICON = require('@/assets/images/main/icon-coin.webp');
const PILL_ASSET = require('@/assets/images/shop/button-pill-blue.webp');
const CLOSE_ICON = require('@/assets/images/menu/icon-close.webp');

export const POPUP_WIDTH = 210;
export const POPUP_HEIGHT = 150;

const BORDER = 2;
// Children are placed in the design's popup coordinates; absolute positions
// inside a bordered View start at the padding box, hence the -BORDER.
const inset = (value: number) => value - BORDER;

const PANEL_INSET = 6;
const TITLE_CENTER_Y = 25.5;
const VALUE_CENTER_Y = 63.5;
const TEXT_BOX_HEIGHT = 30;
const BUTTON_TOP = 91;
const BUTTON_WIDTH = 100;
const BUTTON_HEIGHT = 39;
const PRICE_ROW_TOP = 6;
const CLOSE_SIZE = 18;

const PANEL_BACKGROUND = '#0a3061';
const PANEL_TOP = '#1e5193';
const PANEL_BOTTOM = '#0051b9';
const PRICE_UNAFFORDABLE = '#ff4e4e';

type UpgradePopupProps = {
  step: UpgradeStep;
  locked?: boolean;
  /** Player level is high enough, but a lower climb step isn't owned yet -- see `isStepBuyable`. Mutually exclusive with `locked` in practice (a row that's still level-locked never renders this true), but kept separate so the copy can tell the two apart. */
  sequenceLocked?: boolean;
  /** Already bought -- shows an inert "OWNED" pill instead of the buy button. */
  owned?: boolean;
  /** Player level the step asks for; only shown while it is locked. */
  requiredLevel?: number;
  coins: number;
  style?: StyleProp<ViewStyle>;
  onBuy?: () => void;
  onClose?: () => void;
};

/** Tooltip above the tapped node — Figma nodes 1:1163 and 1:1178. */
export function UpgradePopup({
  step,
  locked,
  sequenceLocked,
  owned,
  requiredLevel,
  coins,
  style,
  onBuy,
  onClose,
}: UpgradePopupProps) {
  const [pressed, setPressed] = useState(false);
  const affordable = coins >= step.cost;

  return (
    <View
      style={[
        {
          width: POPUP_WIDTH,
          height: POPUP_HEIGHT,
          borderRadius: 10,
          borderWidth: BORDER,
          borderColor: Colors.darkPanel,
          backgroundColor: PANEL_BACKGROUND,
        },
        style,
      ]}>
      <LinearGradient
        colors={[PANEL_TOP, PANEL_BOTTOM]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: inset(PANEL_INSET),
          top: inset(PANEL_INSET),
          width: POPUP_WIDTH - PANEL_INSET * 2,
          height: POPUP_HEIGHT - PANEL_INSET * 2,
          borderRadius: 5,
        }}
      />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: inset(TITLE_CENTER_Y - TEXT_BOX_HEIGHT / 2),
          height: TEXT_BOX_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none">
        <GameText
          gradient
          style={{ fontFamily: Fonts.titan, fontSize: 18, textTransform: 'uppercase' }}>
          {UPGRADE_LABELS[step.kind]}
        </GameText>
      </View>

      {locked || sequenceLocked ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
          ]}
          pointerEvents="none">
          <GameText
            style={{
              fontFamily: Fonts.nunito,
              fontSize: 18,
              color: Colors.white,
              textAlign: 'center',
            }}>
            {locked ? `Reach level ${requiredLevel} to unlock` : 'Buy the previous upgrade first'}
          </GameText>
        </View>
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: inset(VALUE_CENTER_Y - TEXT_BOX_HEIGHT / 2),
              height: TEXT_BOX_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents="none">
            <GameText style={{ fontFamily: Fonts.nunito, fontSize: 18, color: Colors.white }}>
              {UPGRADE_LABELS[step.kind]} +{formatCompact(step.value)}
            </GameText>
          </View>

          <GamePressable
            onPress={onBuy}
            // Not affordable is just as much a dead press as already owned --
            // both should say so out loud rather than click and do nothing.
            // The price is already drawn red in that state.
            disabled={owned || !affordable}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
              position: 'absolute',
              left: inset((POPUP_WIDTH - BUTTON_WIDTH) / 2),
              top: inset(BUTTON_TOP),
              width: BUTTON_WIDTH,
              height: BUTTON_HEIGHT,
              opacity: owned ? 0.5 : 1,
              transform: [{ scale: pressed && !owned ? 0.96 : 1 }],
            }}>
            <Image source={PILL_ASSET} style={StyleSheet.absoluteFill} contentFit="fill" />
            {owned ? (
              <View
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                pointerEvents="none">
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <GameText
                    style={{ fontFamily: Fonts.titan, fontSize: 16, color: Colors.white }}>
                    Owned
                  </GameText>
                </View>
              </View>
            ) : (
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
                <Image source={COIN_ICON} style={{ width: 24, height: 24 }} contentFit="contain" />
                <GameText
                  style={{
                    fontFamily: Fonts.titan,
                    fontSize: 18,
                    color: affordable ? Colors.white : PRICE_UNAFFORDABLE,
                  }}>
                  {formatCompact(step.cost)}
                </GameText>
              </View>
            )}
          </GamePressable>
        </>
      )}

      <GamePressable
        onPress={onClose}
        hitSlop={10}
        style={{
          position: 'absolute',
          left: inset(POPUP_WIDTH - CLOSE_SIZE + 5),
          top: inset(-5),
          width: CLOSE_SIZE,
          height: CLOSE_SIZE,
        }}>
        <Image source={CLOSE_ICON} style={StyleSheet.absoluteFill} contentFit="contain" />
      </GamePressable>
    </View>
  );
}
