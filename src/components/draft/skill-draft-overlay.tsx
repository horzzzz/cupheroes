import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { BuyButton } from '@/components/draft/buy-button';
import { SkillCard } from '@/components/draft/skill-card';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { BattleFrame } from '@/constants/battle';
import { DRAFT_REFRESH_COST, canAfford, useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';

const PILL_ORANGE = require('@/assets/images/ui/button-pill.webp');
const PILL_BLUE = require('@/assets/images/shop/button-pill-blue.webp');
const BALL = require('@/assets/images/battle/icon-ball.webp');
const AD = require('@/assets/images/ui/icon-ad.webp');

/** Card centre x's in the 390-wide design frame (Figma 1:1375-1:1377). */
const CARD_CX = [70, 195, 320];
const CARD_W = 110;

/**
 * The post-pachinko skill draft (Figma node 1:1310). Sits over the frozen
 * battle scene: pick one of three cards, or re-roll for balls. Buying a card
 * releases combat (`buySkill`). There's no "skip" -- the roll always contains
 * at least one affordable card (`rollOffers`).
 *
 * Each card + its buttons is one `alignItems:'center'` column so the pill
 * always sits centred under the card, whatever the device scale.
 *
 * `GET ALL` and the per-card `ad` button are drawn per the design but inert
 * until an ad SDK exists -- see the TODOs.
 */
export function SkillDraftOverlay({ clock, scale }: { clock: GameClock; scale: number }) {
  const offers = useBattleStore((s) => s.offers);
  const balls = useBattleStore((s) => s.balls);
  const buySkill = useBattleStore((s) => s.buySkill);
  const refreshOffers = useBattleStore((s) => s.refreshOffers);

  // Still mounted (phase === 'draft') during the short close delay after a buy,
  // but with `offers` cleared -- keep the dim scrim, drop the cards.
  const canRefresh = balls >= DRAFT_REFRESH_COST;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* Figma uses 0.5 + a 4px blur; without the blur a touch more opacity keeps the cards legible. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,6,33,0.62)' }]} />

      {offers && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ width: BattleFrame.width * scale, height: BattleFrame.height * scale }}>
            <GameText
              style={{
                position: 'absolute',
                top: 155 * scale,
                left: 0,
                width: BattleFrame.width * scale,
                textAlign: 'center',
                fontFamily: Fonts.titan,
                fontSize: 24 * scale,
                color: '#ffffff',
                textTransform: 'uppercase',
              }}>
              Select a new skill
            </GameText>

            {offers.map((offer, i) => {
              const affordable = canAfford(offer, balls);
              return (
                <View
                  key={`${offer.id}-${i}`}
                  style={{
                    position: 'absolute',
                    top: 230 * scale,
                    left: (CARD_CX[i] - CARD_W / 2) * scale,
                    width: CARD_W * scale,
                    alignItems: 'center',
                  }}>
                  <SkillCard offer={offer} scale={scale} />

                  <View style={{ height: 15 * scale }} />
                  <BuyButton
                    variant="buy"
                    price={offer.price}
                    affordable={affordable}
                    scale={scale}
                    onPress={() => {
                      if (affordable) buySkill(i, clock.time.value);
                    }}
                  />

                  {!affordable && (
                    <>
                      <View style={{ height: 10 * scale }} />
                      <BuyButton
                        variant="ad"
                        scale={scale}
                        onPress={() => {
                          // TODO(ads): watch a rewarded ad, then `buySkill(i, clock.time.value)` for free.
                        }}
                      />
                    </>
                  )}
                </View>
              );
            })}

            <Pressable
              style={{
                position: 'absolute',
                left: (195 - 95) * scale,
                top: 583 * scale,
                width: 190 * scale,
                height: 70 * scale,
              }}
              onPress={() => {
                // TODO(ads): watch a rewarded ad, then take all three offers for free.
              }}>
              <Image source={PILL_ORANGE} style={StyleSheet.absoluteFill} contentFit="fill" />
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9 * scale,
                }}>
                <Image source={AD} style={{ width: 26 * scale, height: 26 * scale }} contentFit="contain" />
                <GameText
                  style={{
                    fontFamily: Fonts.titan,
                    fontSize: 24 * scale,
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}>
                  Get all
                </GameText>
              </View>
            </Pressable>

            <Pressable
              style={{
                position: 'absolute',
                left: (195 - 95) * scale,
                top: 683 * scale,
                width: 190 * scale,
                height: 70 * scale,
                opacity: canRefresh ? 1 : 0.45,
              }}
              disabled={!canRefresh}
              onPress={refreshOffers}>
              <Image source={PILL_BLUE} style={StyleSheet.absoluteFill} contentFit="fill" />
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6 * scale,
                }}>
                <GameText
                  style={{
                    fontFamily: Fonts.titan,
                    fontSize: 18 * scale,
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}>
                  Refresh
                </GameText>
                <Image source={BALL} style={{ width: 22 * scale, height: 22 * scale }} contentFit="contain" />
                <GameText style={{ fontFamily: Fonts.titan, fontSize: 18 * scale, color: '#ffffff' }}>
                  {DRAFT_REFRESH_COST}
                </GameText>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
