import { HERO_POS, Timing, meleeHasArrived, meleeStepX, mitigatedDamage, type EnemySpec } from '@/constants/battle';
import { NO_MODS, type CombatMods } from '@/game/battle/skills';

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
  /** Absolute game-clock time (seconds) this beat begins animating. */
  startAt: number;
};

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
};

export type RoundResolution = {
  beats: Beat[];
  heroHealthAfter: number;
  enemiesAfter: CombatEnemy[];
  ballsGained: number;
  heroDefeated: boolean;
  waveCleared: boolean;
};

function nearestLiving(enemies: readonly CombatEnemy[]): CombatEnemy | undefined {
  return enemies
    .filter((e) => e.alive)
    .reduce<CombatEnemy | undefined>((nearest, e) => (!nearest || e.standX < nearest.standX ? e : nearest), undefined);
}

/**
 * One round: the hero takes its turn (one or more shots, plus any chained
 * extra turns), then every surviving enemy takes its turn in visual
 * left-to-right order -- a melee enemy closes the distance a bit more if it
 * hasn't arrived (`meleeStepX`), or strikes back once it has, unless it
 * whiffs (`mods.enemyMissChance`). Enemies are skipped entirely once the
 * hero's been felled.
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
  let beatCount = 0;
  const beatStart = () => startedAt + beatCount++ * Timing.beatStagger;

  // --- hero's turn: `mods.arrows` shots, then chained extra turns ---
  let heroDamageDealt = 0;
  const heroVolley = () => {
    for (let shot = 0; shot < Math.max(1, mods.arrows); shot += 1) {
      const target = nearestLiving(nextEnemies);
      if (!target) return;

      const crit = rng() < mods.critChance;
      const base = mitigatedDamage(hero.attack, target.spec.armor);
      const damage = crit ? Math.round(base * mods.critMult) : base;
      target.health = Math.max(0, target.health - damage);
      heroDamageDealt += damage;
      const lethal = target.health <= 0;
      const startAt = beatStart();
      if (lethal) {
        target.alive = false;
        target.diedAt = startAt;
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
        startAt,
      });
    }
  };

  heroVolley();
  let extras = 0;
  while (extras < mods.extraTurnCap && nearestLiving(nextEnemies) && rng() < mods.extraTurnChance) {
    extras += 1;
    // Caption pops at the same instant the hero fires again -- it rides the
    // slot the next volley's first beat will take, so it doesn't stretch the
    // round's timeline.
    beats.push({
      kind: 'notice',
      text: 'EXTRA TURN',
      targetX: HERO_POS.x,
      startAt: startedAt + beatCount * Timing.beatStagger,
    });
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
        startAt: beatStart(),
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
      beats.push({ kind: 'move', actorId: enemy.id, fromX, toX: enemy.standX, startAt: beatStart() });
      continue;
    }

    const missed = rng() < mods.enemyMissChance;
    const damage = missed ? 0 : mitigatedDamage(enemy.spec.attack, hero.armor);
    heroHealth = Math.max(0, heroHealth - damage);
    const lethal = heroHealth <= 0;
    if (lethal) heroDefeated = true;
    beats.push({
      kind: 'attack',
      attackerId: enemy.id,
      targetId: 'hero',
      damage,
      targetHealthAfter: heroHealth,
      lethal,
      missed,
      targetX: HERO_POS.x,
      startAt: beatStart(),
    });
  }

  const waveCleared = !heroDefeated && nextEnemies.every((enemy) => !enemy.alive);

  return { beats, heroHealthAfter: heroHealth, enemiesAfter: nextEnemies, ballsGained, heroDefeated, waveCleared };
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
  return { beats, heroHealthAfter: 0, enemiesAfter: nextEnemies, ballsGained, heroDefeated: false, waveCleared };
}
