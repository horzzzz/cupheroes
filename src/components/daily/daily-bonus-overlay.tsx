import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { useDesignScale } from '@/hooks/use-design-scale';
import {
  formatCountdown,
  localDateKey,
  msUntilLocalMidnight,
  rewardForDay,
  weekStartDay,
} from '@/game/daily/rewards';
import { playSfx } from '@/game/audio/engine';
import { getDailyStatus, useDailyStore } from '@/game/daily/store';

const COIN_ICON = require('@/assets/images/main/icon-coin.webp');
const CLOSE_ICON = require('@/assets/images/menu/icon-close.webp');
const CLAIM_PILL = require('@/assets/images/shop/button-pill-blue.webp');

const PANEL_W = 350;
const PANEL_H = 400;
const CELL = 70;
/** Panel-local left offsets for the 4+3 day grid (Figma Frame 82-85 / 83-85). */
const ROW_1_X = [20, 100, 180, 260];
const ROW_2_X = [60, 140, 220];

type DayCellProps = { day: number; claimed: boolean; s: number };

function DayCell({ day, claimed, s }: DayCellProps) {
  return (
    <View
      style={{
        width: CELL * s,
        height: CELL * s,
        borderRadius: 4 * s,
        overflow: 'hidden',
        borderWidth: claimed ? 1.5 * s : 0,
        borderColor: '#ffd52c',
      }}>
      <LinearGradient
        colors={claimed ? ['#f67300', '#fbd904'] : ['#0a3061', '#104994']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={COIN_ICON}
        style={{
          position: 'absolute',
          top: 8 * s,
          alignSelf: 'center',
          width: 36 * s,
          height: 36 * s,
        }}
        contentFit="contain"
      />
      <GameText
        style={{
          position: 'absolute',
          bottom: 6 * s,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: Fonts.titan,
          fontSize: 22 * s,
          color: '#ffffff',
        }}>
        {rewardForDay(day)}
      </GameText>
    </View>
  );
}

function DayLabel({ day, claimed, s, left }: { day: number; claimed: boolean; s: number; left: number }) {
  return (
    <GameText
      style={{
        position: 'absolute',
        left: left * s,
        width: CELL * s,
        textAlign: 'center',
        fontFamily: Fonts.titan,
        fontSize: 13 * s,
        textTransform: 'uppercase',
        color: claimed ? '#fbd904' : '#bcd8ff',
      }}>
      day {day}
    </GameText>
  );
}

export function DailyBonusOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { s } = useDesignScale();
  const lastClaimDate = useDailyStore((st) => st.lastClaimDate);
  const claimedDay = useDailyStore((st) => st.claimedDay);
  const claim = useDailyStore((st) => st.claim);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!visible) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const today = localDateKey(now);
  const status = getDailyStatus({ lastClaimDate, claimedDay }, today);
  const activeDay = status.phase === 'claimed' ? status.currentDay : status.nextDay;
  const weekStart = weekStartDay(Math.max(1, activeDay));
  const days = Array.from({ length: 7 }, (_, i) => weekStart + i);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <GamePressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps on the popup itself -- no sound, it isn't a button. */}
        <GamePressable silent style={{ width: PANEL_W * s }} onPress={() => {}}>
          <View style={{ width: PANEL_W * s, height: PANEL_H * s }}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#0a3061',
                  borderRadius: 10 * s,
                  borderWidth: 2 * s,
                  borderColor: '#250404',
                },
              ]}
            />
            <LinearGradient
              colors={['#1e5193', '#0051b9']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                position: 'absolute',
                top: 4 * s,
                left: 4 * s,
                right: 4 * s,
                bottom: 4 * s,
                borderRadius: 5 * s,
              }}
            />

            <GamePressable
              onPress={onClose}
              hitSlop={12}
              style={{ position: 'absolute', right: -10 * s, top: -10 * s }}>
              <Image source={CLOSE_ICON} style={{ width: 36 * s, height: 36 * s }} contentFit="contain" />
            </GamePressable>

            <GameText
              gradient
              style={{
                position: 'absolute',
                top: 16 * s,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontFamily: Fonts.titan,
                fontSize: 32 * s,
                textTransform: 'uppercase',
              }}>
              Daily Bonus
            </GameText>

            {/* Row 1 — days weekStart..+3 */}
            <View style={{ position: 'absolute', top: 82 * s, left: 0, right: 0 }}>
              {ROW_1_X.map((x, i) => (
                <DayLabel key={`l1-${i}`} day={days[i]} claimed={days[i] <= claimedDay} s={s} left={x} />
              ))}
            </View>
            {ROW_1_X.map((x, i) => (
              <View key={`c1-${i}`} style={{ position: 'absolute', top: 113 * s, left: x * s }}>
                <DayCell day={days[i]} claimed={days[i] <= claimedDay} s={s} />
              </View>
            ))}

            {/* Row 2 — days +4..+6 */}
            <View style={{ position: 'absolute', top: 203 * s, left: 0, right: 0 }}>
              {ROW_2_X.map((x, i) => (
                <DayLabel key={`l2-${i}`} day={days[i + 4]} claimed={days[i + 4] <= claimedDay} s={s} left={x} />
              ))}
            </View>
            {ROW_2_X.map((x, i) => (
              <View key={`c2-${i}`} style={{ position: 'absolute', top: 234 * s, left: x * s }}>
                <DayCell day={days[i + 4]} claimed={days[i + 4] <= claimedDay} s={s} />
              </View>
            ))}

            <GameText
              style={{
                position: 'absolute',
                top: 324 * s,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontFamily: Fonts.titan,
                fontSize: 18 * s,
                textTransform: 'uppercase',
                color: '#ffffff',
              }}>
              streak: {claimedDay} days
            </GameText>
          </View>

          {/* Below the panel: CLAIM, or the claimed state + countdown. */}
          <View style={{ alignItems: 'center', marginTop: 26 * s }}>
            {status.phase === 'ready' ? (
              <GamePressable
                onPress={() => {
                  // This button only renders while the bonus is claimable,
                  // so the press always succeeds.
                  claim(today);
                  playSfx('ui-purchase');
                }}
                style={{ width: 190 * s, height: 70 * s }}>
                <Image source={CLAIM_PILL} style={StyleSheet.absoluteFill} contentFit="fill" />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <GameText
                    style={{
                      fontFamily: Fonts.titan,
                      fontSize: 24 * s,
                      color: '#ffffff',
                      textTransform: 'uppercase',
                    }}>
                    claim
                  </GameText>
                </View>
              </GamePressable>
            ) : (
              <>
                <GameText
                  style={{
                    fontFamily: Fonts.titan,
                    fontSize: 24 * s,
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}>
                  claimed
                </GameText>
                <GameText
                  gradient
                  style={{
                    marginTop: 10 * s,
                    fontFamily: Fonts.titan,
                    fontSize: 14 * s,
                    textTransform: 'uppercase',
                  }}>
                  next reward in {formatCountdown(msUntilLocalMidnight(now))}
                </GameText>
              </>
            )}
          </View>
        </GamePressable>
      </GamePressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,6,33,0.62)',
  },
});
