import type { AttackBeat } from '@/game/battle/combat';
import { Timing } from '@/constants/battle';
import { clamp01, easeOutBack, easeOutCubic, isActiveWindow, lerp, pingPong, timelineProgress } from '@/game/easing';

/**
 * All of an actor's on-screen motion, computed fresh from the game clock
 * every frame -- idle bob, attack lunge, hit shake/flash, death fade and
 * spawn pop-in composited into one x/y/scale/opacity. Kept as a plain
 * worklet function (not a hook) so a component can call it once per Skia
 * prop without duplicating the animation logic itself.
 */

const SLOT_SIZE = 90;
const IDLE_BOB_AMPLITUDE = 2.5;
const IDLE_BOB_PERIOD = 1.8;
const LUNGE_DISTANCE = 26;
const HIT_SHAKE_DISTANCE = 4;
const DEATH_DROP = 14;

export type ActorLayoutParams = {
  now: number;
  slotX: number;
  slotY: number;
  idleWidth: number;
  idleHeight: number;
  attackWidth: number;
  attackHeight: number;
  /** +1 to lunge/face right (the hero), -1 to lunge/face left (enemies). */
  facing: 1 | -1;
  bobPhase: number;
  visualScale: number;
  attackBeat?: AttackBeat;
  hitBeat?: AttackBeat;
  deathBeat?: AttackBeat;
  /** Game time this actor's wave-entry pop-in began, if it hasn't finished. */
  spawnedAt?: number;
  /** Hero's run-in from off-screen at battle start. */
  runIn?: { fromX: number; duration: number };
};

export type ActorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  pose: 'idle' | 'attack' | 'run';
};

export function computeActorLayout(p: ActorLayoutParams): ActorLayout {
  'worklet';

  if (p.runIn && p.now < p.runIn.duration) {
    const t = easeOutCubic(timelineProgress(p.now, 0, p.runIn.duration));
    const restingX = p.slotX + SLOT_SIZE / 2 - p.idleWidth / 2;
    return {
      x: lerp(p.runIn.fromX, restingX, t),
      y: p.slotY + SLOT_SIZE - p.idleHeight,
      width: p.idleWidth,
      height: p.idleHeight,
      opacity: 1,
      pose: 'run',
    };
  }

  const attacking = !!p.attackBeat && isActiveWindow(p.now, p.attackBeat.startAt, Timing.attackDuration);
  const pose: ActorLayout['pose'] = attacking ? 'attack' : 'idle';
  const w = attacking ? p.attackWidth : p.idleWidth;
  const h = attacking ? p.attackHeight : p.idleHeight;

  let dx = 0;
  let dy = Math.sin(p.now * ((Math.PI * 2) / IDLE_BOB_PERIOD) + p.bobPhase) * IDLE_BOB_AMPLITUDE;
  let opacity = 1;
  let scaleMul = 1;

  if (p.attackBeat) {
    const t = timelineProgress(p.now, p.attackBeat.startAt, Timing.attackDuration);
    dx += pingPong(t) * LUNGE_DISTANCE * p.facing;
  }

  if (p.hitBeat && isActiveWindow(p.now, p.hitBeat.startAt, Timing.hitFlash)) {
    const t = timelineProgress(p.now, p.hitBeat.startAt, Timing.hitFlash);
    dx += Math.sin(t * Math.PI * 3) * HIT_SHAKE_DISTANCE * (1 - t) * -p.facing;
  }

  if (p.deathBeat) {
    const t = timelineProgress(p.now, p.deathBeat.startAt, Timing.deathFade);
    dy += t * DEATH_DROP;
    opacity = 1 - t;
    scaleMul = 1 - t * 0.3;
  } else if (p.spawnedAt !== undefined) {
    const t = timelineProgress(p.now, p.spawnedAt, Timing.spawnIn);
    scaleMul = Math.max(0, easeOutBack(t));
    opacity = clamp01(t * 3);
  }

  const finalScale = p.visualScale * scaleMul;
  const boxCenterX = p.slotX + SLOT_SIZE / 2;
  const boxBottomY = p.slotY + SLOT_SIZE;

  return {
    x: boxCenterX - (w * finalScale) / 2 + dx,
    y: boxBottomY - h * finalScale + dy,
    width: w * finalScale,
    height: h * finalScale,
    opacity,
    pose,
  };
}
