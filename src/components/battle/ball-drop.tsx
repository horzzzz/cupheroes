import { Atlas, Skia, useRSXformBuffer, type SkRect } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { ENEMY_SLOT_Y, Timing } from '@/constants/battle';
import { impactAt } from '@/game/battle/combat';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { clamp01, easeInCubic, easeOutCubic } from '@/game/easing';
import type { SpriteSet } from '@/game/sprites';

/**
 * Balls dropped from a killed enemy, drawn with Skia's `Atlas` -- one draw
 * call for the whole pool regardless of how many are in flight. Each kill
 * drops `BALLS_PER_KILL` balls in three phases, all pure functions of
 * `startAt` (the kill's impact time -- see `impactAt` in `combat.ts`):
 *
 *   1. fall -- tossed a short hop onto the ground near the enemy's feet;
 *   2. rest -- sits there for a beat, so a kill visibly *drops loot* instead
 *      of instantly vanishing into the counter;
 *   3. flight -- the original toss-to-HUD arc, unchanged.
 *
 * Same fixed-pool + one-shot-per-round-assignment pattern pachinko later
 * scales up to hundreds of instances (see the project's memory doc on the
 * battle plan) -- only `POOL_SIZE` and the per-kill count change here.
 */

const BALLS_PER_KILL = 2;
const POOL_SIZE = 16;
const HUD_BALL_TARGET = { x: 37, y: 48 };
const FLIGHT_ARC_HEIGHT = 60;
const FALL_ARC_HEIGHT = 16;
const BALL_FLIGHT_SIZE = 16;
const BALL_GROUND_SIZE = 14;
/** How far apart on the ground the two balls from one kill land. */
const GROUND_SPREAD = 12;
const GROUND_Y = ENEMY_SLOT_Y + 84;

type BallSlot = {
  startAt: number;
  originX: number;
  originY: number;
  groundX: number;
  groundY: number;
  spin: number;
};

function idleSlot(): BallSlot {
  return { startAt: -Infinity, originX: 0, originY: 0, groundX: 0, groundY: 0, spin: 0 };
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

    for (const beat of lethalHits) {
      if (beat.kind !== 'attack') continue;
      const originX = beat.targetX + 45;
      const originY = ENEMY_SLOT_Y + 45;
      for (let i = 0; i < BALLS_PER_KILL; i += 1) {
        const slotIndex = cursor.current % POOL_SIZE;
        cursor.current += 1;
        const side = i === 0 ? -1 : 1;
        next[slotIndex] = {
          startAt: impactAt(beat),
          originX,
          originY,
          groundX: originX + side * (GROUND_SPREAD / 2 + slotIndex % 3),
          groundY: GROUND_Y,
          spin: slotIndex * 0.7,
        };
      }
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

  const nativeWidth = ball ? ball.width() : 0;

  const transforms = useRSXformBuffer(POOL_SIZE, (val, i) => {
    'worklet';
    const now = clock.time.value;
    const slot = slots.value[i];
    if (nativeWidth === 0 || now < slot.startAt) {
      val.set(1, 0, -4000, -4000);
      return;
    }

    const elapsed = now - slot.startAt;
    let x: number;
    let y: number;
    let designWidth: number;
    let angle: number;

    if (elapsed < Timing.ballFall) {
      // Phase 1: a short hop from the kill onto the ground.
      const t = clamp01(elapsed / Timing.ballFall);
      const e = easeOutCubic(t);
      x = slot.originX + (slot.groundX - slot.originX) * e;
      const arc = Math.sin(t * Math.PI) * FALL_ARC_HEIGHT;
      y = slot.originY + (slot.groundY - slot.originY) * easeInCubic(t) - arc;
      designWidth = BALL_GROUND_SIZE;
      angle = slot.spin;
    } else if (elapsed < Timing.ballFall + Timing.ballRest) {
      // Phase 2: sits on the ground.
      x = slot.groundX;
      y = slot.groundY;
      designWidth = BALL_GROUND_SIZE;
      angle = slot.spin;
    } else {
      // Phase 3: toss to the HUD counter -- unchanged arc.
      const t = clamp01((elapsed - Timing.ballFall - Timing.ballRest) / Timing.ballFlight);
      if (t >= 1) {
        val.set(1, 0, -4000, -4000);
        return;
      }
      const e = easeOutCubic(t);
      x = slot.groundX + (HUD_BALL_TARGET.x - slot.groundX) * e;
      const arc = Math.sin(t * Math.PI) * FLIGHT_ARC_HEIGHT;
      y = slot.groundY + (HUD_BALL_TARGET.y - slot.groundY) * e - arc;
      designWidth = BALL_FLIGHT_SIZE * (1 - t * 0.35);
      angle = slot.spin + t * 3;
    }

    const scale = designWidth / nativeWidth;
    const scos = scale * Math.cos(angle);
    const ssin = scale * Math.sin(angle);
    const halfW = (nativeWidth * scale) / 2;
    const halfH = halfW; // the ball art is square
    // RSXform maps the source rect's (0,0) corner to (tx,ty); offset so
    // the *center* of the ball lands on the flight path instead.
    val.set(scos, ssin, x - (scos * halfW - ssin * halfH), y - (ssin * halfW + scos * halfH));
  });

  if (!ball) return null;

  return <Atlas image={ball} sprites={spriteRects} transforms={transforms} />;
}
