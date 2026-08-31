import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Timing } from '@/constants/battle';
import { impactAt } from '@/game/battle/combat';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { clamp01, timelineProgress } from '@/game/easing';

/**
 * Floating text over whoever a beat just touched -- "-N" for a hit, "-N" in
 * gold for a crit, "MISS" when an enemy whiffs (`mods.enemyMissChance`), "+N"
 * in green for a heal (lifesteal or the `heal` skill). A fixed pool assigned
 * round-robin, same shape as the ball-drop pool: numeric animation data
 * (when/where) lives in a shared value so it's driven every frame purely off
 * the game clock -- pause/x2 apply to it same as everything else. The text
 * and its colour change rarely enough (once per beat) to be plain React state.
 */

const POOL_SIZE = 8;
const RISE_DISTANCE = 26;

type NumberVariant = 'hit' | 'crit' | 'miss' | 'heal' | 'notice';
type NumberSlot = { startAt: number; x: number; y: number };

function idleSlot(): NumberSlot {
  return { startAt: -Infinity, x: 0, y: 0 };
}

const VARIANT_STYLE: Record<NumberVariant, { color: string; size: number }> = {
  hit: { color: '#ffef7a', size: 16 },
  crit: { color: '#ff8a3d', size: 22 },
  miss: { color: '#cfe0ff', size: 15 },
  heal: { color: '#7dff9b', size: 16 },
  notice: { color: '#ffd34d', size: 13 },
};

type DamageNumbersProps = {
  clock: GameClock;
  scale: number;
};

export function DamageNumbers({ clock, scale }: DamageNumbersProps) {
  const round = useBattleStore((s) => s.round);

  const slots = useSharedValue<NumberSlot[]>(Array.from({ length: POOL_SIZE }, idleSlot));
  const [texts, setTexts] = useState<string[]>(() => Array(POOL_SIZE).fill(''));
  const [variants, setVariants] = useState<NumberVariant[]>(() => Array(POOL_SIZE).fill('hit'));
  const cursor = useRef(0);

  useEffect(() => {
    if (!round) return;
    const nextSlots = slots.value.slice();
    const nextTexts = [...texts];
    const nextVariants = [...variants];
    let beatIndex = 0;

    for (const beat of round.beats) {
      let text: string;
      let variant: NumberVariant;
      let x: number;
      let y = 290;
      // A number pops when the hit actually lands (`impactAt`, after any
      // projectile flight), not when the attacker starts its swing/shot.
      let startAt: number;
      if (beat.kind === 'attack') {
        x = beat.targetX + 45;
        startAt = impactAt(beat);
        if (beat.missed) {
          text = 'MISS';
          variant = 'miss';
        } else {
          text = `-${beat.damage}`;
          variant = beat.crit ? 'crit' : 'hit';
        }
      } else if (beat.kind === 'heal') {
        x = beat.targetX + 45;
        startAt = beat.startAt;
        text = `+${beat.amount}`;
        variant = 'heal';
      } else if (beat.kind === 'notice') {
        // Floats higher, right over the actor's head rather than beside it.
        x = beat.targetX + 20;
        y = 268;
        startAt = beat.startAt;
        text = beat.text;
        variant = 'notice';
      } else {
        continue;
      }

      const slotIndex = cursor.current % POOL_SIZE;
      cursor.current += 1;
      nextSlots[slotIndex] = {
        startAt,
        x: variant === 'notice' ? x : x + (beatIndex % 2 === 0 ? -6 : 6),
        y,
      };
      nextTexts[slotIndex] = text;
      nextVariants[slotIndex] = variant;
      beatIndex += 1;
    }

    slots.value = nextSlots;
    setTexts(nextTexts);
    setVariants(nextVariants);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per new round object
  }, [round]);

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <DamageNumberSlot
          key={i}
          index={i}
          slots={slots}
          text={texts[i]}
          variant={variants[i]}
          clock={clock}
          scale={scale}
        />
      ))}
    </>
  );
}

function DamageNumberSlot({
  index,
  slots,
  text,
  variant,
  clock,
  scale,
}: {
  index: number;
  slots: SharedValue<NumberSlot[]>;
  text: string;
  variant: NumberVariant;
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

  const { color, size } = VARIANT_STYLE[variant];

  return (
    <Animated.View style={[styles.slot, style]} pointerEvents="none">
      <GameText style={{ fontFamily: Fonts.nunito, fontSize: size * scale, color }}>{text}</GameText>
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
