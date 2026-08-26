/**
 * The upgrade ladder's progression.
 *
 * Every level grants three upgrades — attack, health and defence — and their
 * sizes all follow one curve: damage compounds by ~18.3% per level, health is
 * ten times the damage and armor is four tenths of it. `GROWTH` is the only
 * factor that reproduces the whole brief exactly once rounded:
 *
 *   level  1  2  3  4  5  6  7
 *   damage 10 12 14 17 20 23 27   (health x10, armor x0.4)
 *
 * Level 100 therefore lands around +169M damage, which is why every screen
 * that prints these runs them through `formatCompact`.
 */

export const UPGRADE_LEVEL_COUNT = 100;

const BASE_DAMAGE = 10;
const BASE_COST = 50;
const GROWTH = 1.183;
const HEALTH_PER_DAMAGE = 10;
const ARMOR_PER_DAMAGE = 0.4;

export type UpgradeKind = 'attack' | 'health' | 'defence';

export type UpgradeStep = {
  id: string;
  level: number;
  kind: UpgradeKind;
  /** How much the stat goes up, in that stat's own unit. */
  value: number;
  /** Coins asked for at the buy button. */
  cost: number;
};

export const UPGRADE_LABELS: Record<UpgradeKind, string> = {
  attack: 'Attack',
  health: 'Health',
  defence: 'Defence',
};

function damageAt(level: number): number {
  return Math.round(BASE_DAMAGE * GROWTH ** (level - 1));
}

/**
 * Player level that unlocks an upgrade level. Placeholder rule: the design's
 * popup copy asks for level 10 to unlock upgrade level 2, so it steps by ten.
 */
export function requiredPlayerLevel(level: number): number {
  return (level - 1) * 10;
}

/**
 * Every step, ordered the way the ladder is drawn — top down, so level 100
 * comes first and level 1's attack node is the last (bottom-most) entry.
 * Within a level the climb goes attack -> health -> defence upwards.
 */
export const UPGRADE_STEPS: readonly UpgradeStep[] = (() => {
  const steps: UpgradeStep[] = [];

  for (let level = UPGRADE_LEVEL_COUNT; level >= 1; level -= 1) {
    const damage = damageAt(level);
    const cost = Math.round(BASE_COST * GROWTH ** (level - 1));

    steps.push(
      { id: `${level}-defence`, level, kind: 'defence', value: damage * ARMOR_PER_DAMAGE, cost },
      { id: `${level}-health`, level, kind: 'health', value: damage * HEALTH_PER_DAMAGE, cost },
      { id: `${level}-attack`, level, kind: 'attack', value: damage, cost },
    );
  }

  return steps;
})();
