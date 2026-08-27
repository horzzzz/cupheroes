import { Atlas, Skia, type SkRSXform, type SkRect } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { ENEMY_SLOT_Y, Timing } from '@/constants/battle';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { easeOutCubic, timelineProgress } from '@/game/easing';
import type { SpriteSet } from '@/game/sprites';

/**
 * Balls tossed from a killed enemy to the HUD counter, drawn with Skia's
 * `Atlas` -- one draw call for the whole pool regardless of how many are in
 * flight. Only a handful fly per kill here, but this is deliberately the
 * same component pachinko will scale up to hundreds of instances later (see
 * the project's memory doc on the battle plan): the pool-of-fixed-size +
 * one-shot-per-round-assignment pattern doesn't change, only POOL_SIZE does.
 */

const POOL_SIZE = 8;
const HUD_BALL_TARGET = { x: 37, y: 48 };
const ARC_HEIGHT = 60;
const BALL_FLIGHT_SIZE = 16;

type BallSlot = { startAt: number; fromX: number; fromY: number; toX: number; toY: number; spin: number };

function idleSlot(): BallSlot {
  return { startAt: -Infinity, fromX: 0, fromY: 0, toX: 0, toY: 0, spin: 0 };
}

type BallDropProps = {
  clock: GameClock;
  sprites: SpriteSet;
};

export function BallDrop({ clock, sprites }: BallDropProps) {
  const round = useBattleStore((s) => s.round);
  const ball = sprites.ball;

  const slots = useSharedValue<BallSlot[]>(Array.from({ length: POOL_SIZE }, idleSlot));
  const cursor = useRef(0);

  // Assignment is a one-shot JS write per round (a handful of kills at
  // most), not something that needs to run every frame.
  useEffect(() => {
    if (!round) return;
    const lethalHits = round.beats.filter((beat) => beat.kind === 'attack' && beat.lethal && beat.targetId !== 'hero');
    if (lethalHits.length === 0) return;

    const next = slots.value.slice();

    // One ball per kill.
    for (const beat of lethalHits) {
      if (beat.kind !== 'attack') continue;
      const slotIndex = cursor.current % POOL_SIZE;
      cursor.current += 1;
      next[slotIndex] = {
        startAt: beat.startAt,
        fromX: beat.targetX + 45,
        fromY: ENEMY_SLOT_Y + 45,
        toX: HUD_BALL_TARGET.x,
        toY: HUD_BALL_TARGET.y,
        spin: slotIndex * 0.7,
      };
    }
    slots.value = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per new round object, not on every store field
  }, [round]);

  // The source rect (the whole ball image) never changes, so this is built
  // once rather than every frame.
  const spriteRects = useMemo<SkRect[]>(() => {
    const w = ball?.width() ?? 0;
    const h = ball?.height() ?? 0;
    return Array.from({ length: POOL_SIZE }, () => Skia.XYWHRect(0, 0, w, h));
  }, [ball]);

  const transforms = useDerivedValue<SkRSXform[]>(() => {
    const now = clock.time.value;
    const nativeWidth = ball ? ball.width() : 0;
    return slots.value.map((slot) => {
      const t = timelineProgress(now, slot.startAt, Timing.ballFlight);
      const inFlight = now >= slot.startAt && t < 1;
      if (!inFlight || nativeWidth === 0) return Skia.RSXform(0, 0, -1000, -1000);

      const e = easeOutCubic(t);
      const x = slot.fromX + (slot.toX - slot.fromX) * e;
      const arc = Math.sin(t * Math.PI) * ARC_HEIGHT;
      const y = slot.fromY + (slot.toY - slot.fromY) * e - arc;

      // Rendered a bit smaller than the HUD icon and shrinking further as
      // it nears the counter, for a "tossed coin" read.
      const designWidth = BALL_FLIGHT_SIZE * (1 - t * 0.35);
      const scale = designWidth / nativeWidth;
      const angle = slot.spin + t * 3;
      const scos = scale * Math.cos(angle);
      const ssin = scale * Math.sin(angle);
      const halfW = (nativeWidth * scale) / 2;
      const halfH = halfW; // the ball art is square
      // RSXform maps the source rect's (0,0) corner to (tx,ty); offset so
      // the *center* of the ball lands on the flight path instead.
      return Skia.RSXform(scos, ssin, x - (scos * halfW - ssin * halfH), y - (ssin * halfW + scos * halfH));
    });
  });

  if (!ball) return null;

  return <Atlas image={ball} sprites={spriteRects} transforms={transforms} />;
}
