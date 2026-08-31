import { HERO_POS, Timing, meleeHasArrived, meleeStepX, mitigatedDamage, type EnemySpec } from '@/constants/battle';
import { ARROW_SPLASH_MULT, NO_MODS, type CombatMods } from '@/game/battle/skills';

/**
 * Pure combat math -- no React, no store, no clock. Given a snapshot of the
 * hero and its enemies, produces the next snapshot plus a list of "beats"
 * (who hit whom, for how much, when) that the render layer replays against
 * the game clock. Kept separate from `store.ts` so the turn logic can be
 * exercised without mounting anything.
 *
 * Run-scoped skills reach here as `CombatMods` (see `skills.ts`): the hero
 * fires `mods.arrows` shots per turn, may chain extra turns, crits, heals
 * off its own damage (lifesteal) and makes enemies whiff (`missed`). The
 * `rng` is a parameter, not `Math.random`, so a seeded run is reproducible
 * in tests.
 */

export type CombatEnemy = {
  id: string;
  spec: EnemySpec;
  health: number;
  alive: boolean;
  /** Position within the pack -- picks the slot x and, for melee, which approach-line x it's closing on. */
  slotIndex: number;
  slotX: number;
  /** How many of this enemy's own turns it has spent closing in (melee only, capped at `MELEE_APPROACH_TURNS`). */
  steps: number;
  /** Current on-screen x, derived from `slotX`/`steps` via `meleeStepX` for a melee enemy -- what every
   * render layer reads. */
  standX: number;
  /** Absolute game-clock time this enemy took its lethal hit, if dead -- persists across later rounds
   * (unlike a round's beats) so the death fade can't reset once a *different* enemy's round comes along. */
  diedAt?: number;
};

export type CombatHero = {
  health: number;
  maxHealth: number;
  attack: number;
  armor: number;
};

export type AttackBeat = {
  kind: 'attack';
  attackerId: string;
  targetId: string;
  damage: number;
  targetHealthAfter: number;
  lethal: boolean;
  /** The attacker rolled a miss -- `damage` is 0, shown as "MISS" instead of a number. */
  missed?: boolean;
  /** The hero rolled a critical hit -- `damage` already includes the multiplier. */
  crit?: boolean;
  /** Target's on-screen x when this beat starts, for damage numbers/ball-drop to land on. */
  targetX: number;
  /** Attacker's on-screen x when this beat starts -- the projectile's muzzle point (see `projectiles.tsx`).
   * Undefined for a beat with no attacker actor to launch from (e.g. `resolveBomb`'s AoE). */
  attackerX?: number;
  /** Projectile flight time in seconds, 0 (or omitted) for an instant/melee hit. The beat's *impact* --
   * when damage actually lands, the target flashes, and a lethal hit's death/loot beats begin -- is
   * `startAt + travel`, not `startAt` (that's when the attacker's own swing/shot animation starts). See
   * `impactAt`. */
  travel?: number;
  /** Absolute game-clock time (seconds) this beat begins animating (the attacker's windup/shot). */
  startAt: number;
};

/** When an attack beat's damage actually lands -- `startAt` plus its projectile's flight time, if any.
 * Everything about the *target* (hit-flash, health tween, death fade, loot) keys off this, not `startAt`,
 * which is only when the *attacker* starts its own swing/shot animation. */
export function impactAt(beat: Pick<AttackBeat, 'startAt' | 'travel'>): number {
  'worklet';
  return beat.startAt + (beat.travel ?? 0);
}

export type MoveBeat = {
  kind: 'move';
  actorId: string;
  fromX: number;
  toX: number;
  /** Absolute game-clock time (seconds) this beat begins animating. */
  startAt: number;
};

export type HealBeat = {
  kind: 'heal';
  targetId: string;
  amount: number;
  targetHealthAfter: number;
  /** Target's on-screen x, for the floating "+N". */
  targetX: number;
  /** Absolute game-clock time (seconds) this beat begins animating. */
  startAt: number;
};

export type NoticeBeat = {
  kind: 'notice';
  /** Short caption to float over the actor, e.g. "EXTRA TURN". */
  text: string;
  /** Actor's on-screen x the caption floats above. */
  targetX: number;
  /** Absolute game-clock time (seconds) this caption appears. */
  startAt: number;
};

export type Beat = AttackBeat | MoveBeat | HealBeat | NoticeBeat;

export type Round = {
  index: number;
  startedAt: number;
  beats: Beat[];
  /** Game-clock seconds from `startedAt` to this round's last beat -- what the scheduler waits before the next round. */
  duration: number;
};

export type RoundResolution = {
  beats: Beat[];
  heroHealthAfter: number;
  enemiesAfter: CombatEnemy[];
  ballsGained: number;
  heroDefeated: boolean;
  waveCleared: boolean;
  /** Game-clock seconds this round's beats span -- see `Round.duration`. */
  duration: number;
};

function nearestLiving(enemies: readonly CombatEnemy[]): CombatEnemy | undefined {
  return enemies
    .filter((e) => e.alive)
    .reduce<CombatEnemy | undefined>((nearest, e) => (!nearest || e.standX < nearest.standX ? e : nearest), undefined);
}

/**
 * One round: the hero takes its turn (a volley against `mods.arrows`
 * targets, plus any chained extra turns), then every surviving enemy takes
 * its turn in visual left-to-right order -- a melee enemy closes the
 * distance a bit more if it hasn't arrived (`meleeStepX`), or strikes back
 * (once, or `spec.attacksPerTurn` times for the boss) once it has, unless it
 * whiffs (`mods.enemyMissChance`). Enemies are skipped entirely once the
 * hero's been felled.
 *
 * Beats within the hero's own turn (shots, the lifesteal heal) are spaced a
 * full `Timing.beatStagger` apart, same as the gap into the enemies' turn
 * that follows -- but beats *within* the enemies' turn (one enemy's move or
 * hit to the next, or one boss hit to the next) use the tighter
 * `Timing.enemyVolleyStagger`, since a full wave's enemy count would
 * otherwise make a round drag (see the balance plan). `duration` on the
 * result is the actual elapsed time this produced, so the scheduler doesn't
 * have to re-derive it from the beat count.
 */
export function resolveRound(
  hero: CombatHero,
  enemies: readonly CombatEnemy[],
  startedAt: number,
  mods: CombatMods = NO_MODS,
  rng: () => number = Math.random,
): RoundResolution {
  const beats: Beat[] = [];
  const nextEnemies = enemies.map((enemy) => ({ ...enemy }));
  let ballsGained = 0;
  let cursor = 0;
  // Hero-phase beats (shots, extra-turn notices, lifesteal) each claim a
  // full `beatStagger` slot. `peek` reads the next slot's start time without
  // claiming it -- how a notice beat rides the same slot as the volley that
  // follows it, instead of stretching the round.
  const peekHeroStart = () => startedAt + cursor;
  const heroBeatStart = () => {
    const t = peekHeroStart();
    cursor += Timing.beatStagger;
    return t;
  };
  // The enemies' turn starts with one full `beatStagger` gap from the hero's
  // last beat (so the last shot's animation clears), then every subsequent
  // beat inside the turn is a tighter `enemyVolleyStagger` apart.
  let enemyPhaseStarted = false;
  const enemyBeatStart = () => {
    const gap = enemyPhaseStarted ? Timing.enemyVolleyStagger : Timing.beatStagger;
    enemyPhaseStarted = true;
    const t = startedAt + cursor;
    cursor += gap;
    return t;
  };

  // --- hero's turn: a volley against up to `mods.arrows` distinct targets, then chained extra turns ---
  let heroDamageDealt = 0;
  const heroVolley = () => {
    const targets = nextEnemies
      .filter((e) => e.alive)
      .sort((a, b) => a.standX - b.standX)
      .slice(0, Math.max(1, mods.arrows));

    targets.forEach((target, index) => {
      const crit = rng() < mods.critChance;
      const base = mitigatedDamage(hero.attack, target.spec.armor);
      // Only the nearest target takes full damage -- every target `arrows`
      // adds beyond it is a secondary hit at reduced damage (see `ARROW_SPLASH_MULT`).
      const scaled = index === 0 ? base : Math.round(base * ARROW_SPLASH_MULT);
      const damage = crit ? Math.round(scaled * mods.critMult) : scaled;
      target.health = Math.max(0, target.health - damage);
      heroDamageDealt += damage;
      const lethal = target.health <= 0;
      const startAt = heroBeatStart();
      // The hero is always a ranged archer -- every shot is a travelling arrow.
      const travel = Timing.projectileTravel;
      if (lethal) {
        target.alive = false;
        target.diedAt = startAt + travel;
        ballsGained += target.spec.ballDrop + mods.bonusBallsPerKill;
      }
      beats.push({
        kind: 'attack',
        attackerId: 'hero',
        targetId: target.id,
        damage,
        targetHealthAfter: target.health,
        lethal,
        crit,
        targetX: target.standX,
        attackerX: HERO_POS.x,
        travel,
        startAt,
      });
    });
  };

  heroVolley();
  let extras = 0;
  while (extras < mods.extraTurnCap && nearestLiving(nextEnemies) && rng() < mods.extraTurnChance) {
    extras += 1;
    // Caption pops at the same instant the hero fires again -- it rides the
    // slot the next volley's first beat will take, so it doesn't stretch the
    // round's timeline.
    beats.push({ kind: 'notice', text: 'EXTRA TURN', targetX: HERO_POS.x, startAt: peekHeroStart() });
    heroVolley();
  }

  // Lifesteal: one heal beat for the whole turn's damage, after the shots.
  let heroHealth = hero.health;
  if (mods.lifesteal > 0 && heroDamageDealt > 0 && heroHealth < hero.maxHealth) {
    const amount = Math.min(Math.round(heroDamageDealt * mods.lifesteal), hero.maxHealth - heroHealth);
    if (amount > 0) {
      heroHealth += amount;
      beats.push({
        kind: 'heal',
        targetId: 'hero',
        amount,
        targetHealthAfter: heroHealth,
        targetX: HERO_POS.x,
        startAt: heroBeatStart(),
      });
    }
  }

  // --- enemies' turns ---
  let heroDefeated = false;
  const turnOrder = [...nextEnemies].sort((a, b) => a.slotIndex - b.slotIndex);
  for (const enemy of turnOrder) {
    if (!enemy.alive || heroDefeated) continue;

    if (enemy.spec.range === 'melee' && !meleeHasArrived(enemy.steps)) {
      const fromX = enemy.standX;
      enemy.steps += 1;
      enemy.standX = meleeStepX(enemy.slotX, enemy.slotIndex, enemy.steps);
      beats.push({ kind: 'move', actorId: enemy.id, fromX, toX: enemy.standX, startAt: enemyBeatStart() });
      continue;
    }

    for (let hit = 0; hit < enemy.spec.attacksPerTurn && !heroDefeated; hit += 1) {
      const missed = rng() < mods.enemyMissChance;
      let damage = 0;
      if (!missed) {
        const mitigated = mitigatedDamage(enemy.spec.attack, hero.armor);
        damage = Math.max(1, Math.round(mitigated * (1 - mods.damageReduction)));
      }
      heroHealth = Math.max(0, heroHealth - damage);
      const lethal = heroHealth <= 0;
      if (lethal) heroDefeated = true;
      // Only a ranged enemy's hit travels as a projectile -- a melee enemy has
      // already closed the distance (`meleeHasArrived`) and swings on contact.
      const travel = enemy.spec.range === 'ranged' ? Timing.projectileTravel : 0;
      beats.push({
        kind: 'attack',
        attackerId: enemy.id,
        targetId: 'hero',
        damage,
        targetHealthAfter: heroHealth,
        lethal,
        missed,
        targetX: HERO_POS.x,
        attackerX: enemy.standX,
        travel,
        startAt: enemyBeatStart(),
      });
    }
  }

  const waveCleared = !heroDefeated && nextEnemies.every((enemy) => !enemy.alive);
  const duration = Math.max(cursor, Timing.beatStagger);

  return {
    beats,
    heroHealthAfter: heroHealth,
    enemiesAfter: nextEnemies,
    ballsGained,
    heroDefeated,
    waveCleared,
    duration,
  };
}

/**
 * A `bomb` skill fired from the draft screen: flat `heroAttack * mult`
 * (after each enemy's armor) to every living enemy at once, all beats
 * landing together. Pure, like `resolveRound` -- the store turns the result
 * into a synthetic round so the existing damage-number / death-fade layers
 * replay it.
 */
export function resolveBomb(
  heroAttack: number,
  mult: number,
  enemies: readonly CombatEnemy[],
  startedAt: number,
): RoundResolution {
  const beats: Beat[] = [];
  const nextEnemies = enemies.map((enemy) => ({ ...enemy }));
  let ballsGained = 0;

  for (const enemy of nextEnemies) {
    if (!enemy.alive) continue;
    const damage = mitigatedDamage(Math.round(heroAttack * mult), enemy.spec.armor);
    enemy.health = Math.max(0, enemy.health - damage);
    const lethal = enemy.health <= 0;
    if (lethal) {
      enemy.alive = false;
      enemy.diedAt = startedAt;
      ballsGained += enemy.spec.ballDrop;
    }
    beats.push({
      kind: 'attack',
      attackerId: 'bomb',
      targetId: enemy.id,
      damage,
      targetHealthAfter: enemy.health,
      lethal,
      targetX: enemy.standX,
      startAt: startedAt,
    });
  }

  const waveCleared = nextEnemies.every((enemy) => !enemy.alive);
  return { beats, heroHealthAfter: 0, enemiesAfter: nextEnemies, ballsGained, heroDefeated: false, waveCleared, duration: 0 };
}
