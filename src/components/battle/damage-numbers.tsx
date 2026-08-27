import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Timing, enemySlotPositions } from '@/constants/battle';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { clamp01, timelineProgress } from '@/game/easing';

/**
 * Floating "-N" text over whoever just got hit. A fixed pool assigned
 * round-robin, same shape as the ball-drop pool: numeric animation data
 * (when/where) lives in a shared value so it's driven every frame purely
 * off the game clock -- pause/x2 apply to it same as everything else. The
 * text itself changes rarely enough (once per beat) that it's just plain
 * React state instead.
 */

const POOL_SIZE = 8;
const RISE_DISTANCE = 26;

type NumberSlot = { startAt: number; x: number; y: number };

function idleSlot(): NumberSlot {
  return { startAt: -Infinity, x: 0, y: 0 };
}

type DamageNumbersProps = {
  clock: GameClock;
  scale: number;
};

export function DamageNumbers({ clock, scale }: DamageNumbersProps) {
  const round = useBattleStore((s) => s.round);
  const enemies = useBattleStore((s) => s.enemies);

  const slots = useSharedValue<NumberSlot[]>(Array.from({ length: POOL_SIZE }, idleSlot));
  const [texts, setTexts] = useState<string[]>(() => Array(POOL_SIZE).fill(''));
  const cursor = useRef(0);

  useEffect(() => {
    if (!round) return;
    const positions = enemySlotPositions(enemies.length);
    const nextSlots = slots.value.slice();
    const nextTexts = [...texts];

    round.beats.forEach((beat, beatIndex) => {
      const target =
        beat.targetId === 'hero'
          ? { x: 70, y: 290 }
          : (() => {
              const idx = enemies.findIndex((e) => e.id === beat.targetId);
              const pos = positions[idx] ?? { x: 0, y: 0 };
              return { x: pos.x + 45, y: 290 };
            })();

      const slotIndex = cursor.current % POOL_SIZE;
      cursor.current += 1;
      nextSlots[slotIndex] = { startAt: beat.startAt, x: target.x + (beatIndex % 2 === 0 ? -6 : 6), y: target.y };
      nextTexts[slotIndex] = `-${beat.damage}`;
    });

    slots.value = nextSlots;
    setTexts(nextTexts);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per new round object
  }, [round]);

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <DamageNumberSlot key={i} index={i} slots={slots} text={texts[i]} clock={clock} scale={scale} />
      ))}
    </>
  );
}

function DamageNumberSlot({
  index,
  slots,
  text,
  clock,
  scale,
}: {
  index: number;
  slots: SharedValue<NumberSlot[]>;
  text: string;
  clock: GameClock;
  scale: number;
}) {
  const style = useAnimatedStyle(() => {
    const slot = slots.value[index];
    const t = timelineProgress(clock.time.value, slot.startAt, Timing.damageNumber);
    const visible = clock.time.value >= slot.startAt && t < 1;
    return {
      opacity: visible ? 1 - clamp01((t - 0.6) / 0.4) : 0,
      transform: [{ translateX: slot.x * scale }, { translateY: (slot.y - t * RISE_DISTANCE) * scale }],
    };
  });

  return (
    <Animated.View style={[styles.slot, style]} pointerEvents="none">
      <GameText style={{ fontFamily: Fonts.nunito, fontSize: 16 * scale, color: '#ffef7a' }}>{text}</GameText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
