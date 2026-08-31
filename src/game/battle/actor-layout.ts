import { impactAt, type AttackBeat, type HealBeat, type MoveBeat } from '@/game/battle/combat';
import { Timing } from '@/constants/battle';
import { easeOutCubic, isActiveWindow, lerp, pingPong, timelineProgress } from '@/game/easing';

/**
 * All of an actor's on-screen motion, computed fresh from the game clock
 * every frame -- idle bob, attack lunge, hit shake/flash and death fade
 * composited into one x/y/scale/opacity. Kept as a plain worklet function
 * (not a hook) so a component can call it once per Skia prop without
 * duplicating the animation logic itself.
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
  /** Every attack beat this actor throws this round (one per arrow, times any extra turns). */
  attackBeats?: readonly AttackBeat[];
  /** Every attack beat that lands on this actor this round (each enemy gets its own swing at the hero). */
  hitBeats?: readonly AttackBeat[];
  /** Game-clock time this actor died, if it's dead -- a plain timestamp (not a round-scoped beat) so the
   * fade-out doesn't reset once combat moves on to a round that no longer mentions this actor. */
  deadAt?: number;
  /** Run-in from off-screen -- the hero at battle start, or an entering enemy at the start of a pack. */
  runIn?: { fromX: number; startAt: number; duration: number };
  /** A melee enemy's in-round approach step toward the hero. */
  moveBeat?: MoveBeat;
  /** Hero walking forward in place between packs -- the background pans, the sprite just switches to its run pose. */
  walking?: boolean;
};

export type ActorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  pose: 'idle' | 'attack' | 'run';
};

/** The beat currently animating (or the most recent one still within its `duration` window), else
 * undefined -- windowed off `at(beat)` so the same scan can key an attacker's own beats by `startAt`
 * (its swing/shot windup) or a target's incoming beats by `impactAt` (when the hit actually lands). */
function currentBeat(
  beats: readonly AttackBeat[] | undefined,
  now: number,
  duration: number,
  at: (beat: AttackBeat) => number,
): AttackBeat | undefined {
  'worklet';
  if (!beats) return undefined;
  let active: AttackBeat | undefined;
  for (const beat of beats) {
    const start = at(beat);
    if (start <= now && now < start + duration) active = beat;
  }
  return active;
}

export function computeActorLayout(p: ActorLayoutParams): ActorLayout {
  'worklet';

  const attackBeat = currentBeat(p.attackBeats, p.now, Timing.attackDuration, (b) => b.startAt);
  const hitBeat = currentBeat(p.hitBeats, p.now, Timing.hitFlash, impactAt);

  if (p.runIn && p.now < p.runIn.startAt + p.runIn.duration) {
    const t = easeOutCubic(timelineProgress(p.now, p.runIn.startAt, p.runIn.duration));
    const w = p.idleWidth * p.visualScale;
    const h = p.idleHeight * p.visualScale;
    const restingX = p.slotX + SLOT_SIZE / 2 - w / 2;
    return {
      x: lerp(p.runIn.fromX, restingX, t),
      y: p.slotY + SLOT_SIZE - h,
      width: w,
      height: h,
      opacity: 1,
      pose: 'run',
    };
  }

  // A melee enemy mid-approach reads its box position from the move beat's
  // fromX/toX tween instead of its (already-updated) resting `slotX` --
  // otherwise it would teleport to the new spot instead of walking there.
  // Critically, that includes the gap *before* the beat starts too: the
  // round updates `slotX`/`standX` to the post-step value the instant it
  // resolves, but this beat doesn't start animating until its own turn
  // comes up later in the same round (after the hero's attack beat, say) --
  // reading `p.slotX` during that gap would render the enemy at its new
  // spot before it's supposed to have moved there at all, then yank it back
  // to `fromX` the moment the beat actually starts.
  let effectiveSlotX = p.slotX;
  let moving = false;
  if (p.moveBeat) {
    if (p.now < p.moveBeat.startAt) {
      effectiveSlotX = p.moveBeat.fromX;
    } else if (isActiveWindow(p.now, p.moveBeat.startAt, Timing.moveStep)) {
      const t = easeOutCubic(timelineProgress(p.now, p.moveBeat.startAt, Timing.moveStep));
      effectiveSlotX = lerp(p.moveBeat.fromX, p.moveBeat.toX, t);
      moving = true;
    }
  }

  const attacking = !!attackBeat && isActiveWindow(p.now, attackBeat.startAt, Timing.attackDuration);
  const pose: ActorLayout['pose'] = attacking ? 'attack' : moving || p.walking ? 'run' : 'idle';
  const w = attacking ? p.attackWidth : p.idleWidth;
  const h = attacking ? p.attackHeight : p.idleHeight;

  let dx = 0;
  let dy = Math.sin(p.now * ((Math.PI * 2) / IDLE_BOB_PERIOD) + p.bobPhase) * IDLE_BOB_AMPLITUDE;
  let opacity = 1;
  let scaleMul = 1;

  if (attackBeat) {
    const t = timelineProgress(p.now, attackBeat.startAt, Timing.attackDuration);
    dx += pingPong(t) * LUNGE_DISTANCE * p.facing;
  }

  if (hitBeat && isActiveWindow(p.now, impactAt(hitBeat), Timing.hitFlash)) {
    const t = timelineProgress(p.now, impactAt(hitBeat), Timing.hitFlash);
    dx += Math.sin(t * Math.PI * 3) * HIT_SHAKE_DISTANCE * (1 - t) * -p.facing;
  }

  if (p.deadAt !== undefined) {
    const t = timelineProgress(p.now, p.deadAt, Timing.deathFade);
    dy += t * DEATH_DROP;
    opacity = 1 - t;
    scaleMul = 1 - t * 0.3;
  }

  const finalScale = p.visualScale * scaleMul;
  const boxCenterX = effectiveSlotX + SLOT_SIZE / 2;
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

/**
 * An enemy's design-frame x at `now`, following the same move-beat tween as
 * `computeActorLayout` -- for the plain-RN layers (health bar) that sit at a
 * fixed slot position today but need to ride along with a melee enemy's
 * approach instead of snapping to `standX` a beat early. Same
 * before/during/after handling as `computeActorLayout`'s `effectiveSlotX`,
 * for the same reason -- `standX` is already the post-step value from the
 * moment the round resolves, not just once this beat's turn comes up.
 */
export function moveOffsetAt(now: number, standX: number, moveBeat?: MoveBeat): number {
  'worklet';
  if (moveBeat) {
    if (now < moveBeat.startAt) return moveBeat.fromX;
    if (isActiveWindow(now, moveBeat.startAt, Timing.moveStep)) {
      const t = easeOutCubic(timelineProgress(now, moveBeat.startAt, Timing.moveStep));
      return lerp(moveBeat.fromX, moveBeat.toX, t);
    }
  }
  return standX;
}

/**
 * An actor's displayed health at `now`, from the current round's attack
 * beats that hit it (`hitBeats`, sorted ascending by `startAt` -- `resolveRound`
 * always produces them in that order). The store commits a round's *final*
 * health the instant it resolves, all at once, but a round can hit the same
 * actor several beats apart (every enemy gets its own beat against the
 * hero) -- reading the store value straight would make the health bar drop
 * for a hit that hasn't visually landed yet. Each beat already carries both
 * its own damage and the health it left behind, so the health *before* that
 * beat is just `targetHealthAfter + damage` -- no separate "health before
 * this round" snapshot needs to be threaded through.
 *
 * `events` mixes attack beats and heal beats (lifesteal / the `heal` skill),
 * in the order `resolveRound` produced them -- each carries the health it
 * left behind, so the health *before* it is `after + damage` for a hit or
 * `after - amount` for a heal.
 */
export function healthAt(
  now: number,
  events: readonly (AttackBeat | HealBeat)[],
  fallbackHealth: number,
): number {
  'worklet';
  let health = fallbackHealth;
  for (const beat of events) {
    // A heal is instant (no travel); a hit's health change lands with its projectile's impact.
    const at = beat.kind === 'heal' ? beat.startAt : impactAt(beat);
    const t = timelineProgress(now, at, Timing.healthTween);
    const before =
      beat.kind === 'heal' ? beat.targetHealthAfter - beat.amount : beat.targetHealthAfter + beat.damage;
    health = lerp(before, beat.targetHealthAfter, t);
  }
  return health;
}
