import { Timing, mitigatedDamage, type EnemySpec } from '@/constants/battle';

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
};

export type CombatHero = {
  health: number;
  maxHealth: number;
  attack: number;
  armor: number;
};

export type AttackBeat = {
  attackerId: string;
  targetId: string;
  damage: number;
  targetHealthAfter: number;
  lethal: boolean;
  /** Absolute game-clock time (seconds) this beat begins animating. */
  startAt: number;
};

export type Round = {
  index: number;
  startedAt: number;
  beats: AttackBeat[];
};

export type RoundResolution = {
  beats: AttackBeat[];
  heroHealthAfter: number;
  enemiesAfter: CombatEnemy[];
  ballsGained: number;
  heroDefeated: boolean;
  waveCleared: boolean;
};

/**
 * One round: the hero strikes the front-most living enemy, then every
 * surviving enemy (in slot order) strikes back -- unless the hero's already
 * been felled, in which case the remaining enemies don't get a free hit.
 */
export function resolveRound(hero: CombatHero, enemies: readonly CombatEnemy[], startedAt: number): RoundResolution {
  const beats: AttackBeat[] = [];
  const nextEnemies = enemies.map((enemy) => ({ ...enemy }));
  let ballsGained = 0;
  let beatCount = 0;
  const beatStart = () => startedAt + beatCount++ * Timing.beatStagger;

  const target = nextEnemies.find((enemy) => enemy.alive);
  if (target) {
    const damage = mitigatedDamage(hero.attack, target.spec.armor);
    target.health = Math.max(0, target.health - damage);
    const lethal = target.health <= 0;
    if (lethal) {
      target.alive = false;
      ballsGained += target.spec.ballDrop;
    }
    beats.push({
      attackerId: 'hero',
      targetId: target.id,
      damage,
      targetHealthAfter: target.health,
      lethal,
      startAt: beatStart(),
    });
  }

  let heroHealth = hero.health;
  let heroDefeated = false;
  for (const enemy of nextEnemies) {
    if (!enemy.alive || heroDefeated) continue;
    const damage = mitigatedDamage(enemy.spec.attack, hero.armor);
    heroHealth = Math.max(0, heroHealth - damage);
    const lethal = heroHealth <= 0;
    if (lethal) heroDefeated = true;
    beats.push({
      attackerId: enemy.id,
      targetId: 'hero',
      damage,
      targetHealthAfter: heroHealth,
      lethal,
      startAt: beatStart(),
    });
  }

  const waveCleared = !heroDefeated && nextEnemies.every((enemy) => !enemy.alive);

  return { beats, heroHealthAfter: heroHealth, enemiesAfter: nextEnemies, ballsGained, heroDefeated, waveCleared };
}
