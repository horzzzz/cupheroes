import { HERO_POS, Timing, meleeHasArrived, meleeStepX, mitigatedDamage, type EnemySpec } from '@/constants/battle';

/**
 * Pure combat math -- no React, no store, no clock. Given a snapshot of the
 * hero and its enemies, produces the next snapshot plus a list of "beats"
 * (who hit whom, for how much, when) that the render layer replays against
 * the game clock. Kept separate from `store.ts` so the turn logic can be
 * exercised without mounting anything.
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

export type Beat = AttackBeat | MoveBeat;

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

/**
 * One round: the hero strikes the nearest living enemy, then every
 * surviving enemy takes its turn in visual left-to-right order (a melee
 * enemy leads the pack, so it goes before the ranged enemies behind it) --
 * closing the distance a bit more (`meleeStepX`) if it hasn't arrived yet,
 * or striking back once it has. Skipped entirely if the hero's already been
 * felled, so the remaining enemies don't get a free hit.
 */
export function resolveRound(hero: CombatHero, enemies: readonly CombatEnemy[], startedAt: number): RoundResolution {
  const beats: Beat[] = [];
  const nextEnemies = enemies.map((enemy) => ({ ...enemy }));
  let ballsGained = 0;
  let beatCount = 0;
  const beatStart = () => startedAt + beatCount++ * Timing.beatStagger;

  const living = nextEnemies.filter((enemy) => enemy.alive);
  const target = living.reduce<CombatEnemy | undefined>(
    (nearest, enemy) => (!nearest || enemy.standX < nearest.standX ? enemy : nearest),
    undefined,
  );
  if (target) {
    const damage = mitigatedDamage(hero.attack, target.spec.armor);
    target.health = Math.max(0, target.health - damage);
    const lethal = target.health <= 0;
    const startAt = beatStart();
    if (lethal) {
      target.alive = false;
      target.diedAt = startAt;
      ballsGained += target.spec.ballDrop;
    }
    beats.push({
      kind: 'attack',
      attackerId: 'hero',
      targetId: target.id,
      damage,
      targetHealthAfter: target.health,
      lethal,
      targetX: target.standX,
      startAt,
    });
  }

  let heroHealth = hero.health;
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

    const damage = mitigatedDamage(enemy.spec.attack, hero.armor);
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
      targetX: HERO_POS.x,
      startAt: beatStart(),
    });
  }

  const waveCleared = !heroDefeated && nextEnemies.every((enemy) => !enemy.alive);

  return { beats, heroHealthAfter: heroHealth, enemiesAfter: nextEnemies, ballsGained, heroDefeated, waveCleared };
}
