/**
 * The run-scoped skill draft (Figma node 1:1310).
 *
 * After every pachinko interlude the player is offered three skill cards and
 * spends the balls they just collected on one. Skills last only for the
 * current run -- `useBattleStore.reset()` wipes `ownedSkills` -- and stack by
 * level: owning level 3 of `attack` is a flat +30%, not +10+20+30.
 *
 * This file is the single source of every number. `src/game/battle/skills.ts`
 * turns an owned-levels map into combat modifiers; `resolveRound` in
 * `combat.ts` and the hero-stat recompute in `store.ts` apply them.
 *
 * Icon art is sliced from one Figma spritesheet (skill_pic_1..12, a 4x3 grid)
 * -- see the project memory. Cell 10 ("coins") is exported but its skill is
 * disabled until the coin economy exists, so it never enters a roll.
 */

export type SkillId =
  | 'attack'
  | 'defence'
  | 'maxHealth'
  | 'heal'
  | 'miss'
  | 'crit'
  | 'lifesteal'
  | 'balls'
  | 'extraTurn'
  | 'arrows'
  | 'bomb'
  | 'coins';

/** `mod` skills change combat every round for the rest of the run; `instant` skills fire once, at purchase. */
export type SkillKind = 'mod' | 'instant';

export type SkillDef = {
  id: SkillId;
  icon: number;
  /** Number of stars on the card -- also the level cap. */
  maxLevel: number;
  /** Cumulative effect value at each level (index 0 = level 1). Units are per-skill (see `label`). */
  values: readonly number[];
  /** Ball cost to buy each level (index 0 = level 1). Level 1 is always free, per design. */
  prices: readonly number[];
  /** Earliest wave a draft can offer this skill -- weak skills from wave 2, stronger ones later. */
  minWave: number;
  /** Relative weight in the roll; early-tier skills weigh more so they dominate the first drafts. */
  weight: number;
  kind: SkillKind;
  /** `coins` is false until coins are a real currency -- keeps it out of `rollOffers`. */
  enabled: boolean;
  /** Card label for a cumulative value, e.g. `attack` at level 3 -> "ATTACK +30%". */
  label: (value: number) => string;
};

export const SKILLS: Record<SkillId, SkillDef> = {
  attack: {
    id: 'attack',
    icon: require('@/assets/images/skills/attack.webp'),
    maxLevel: 3,
    values: [10, 20, 30],
    prices: [0, 25, 50],
    minWave: 2,
    weight: 10,
    kind: 'mod',
    enabled: true,
    label: (v) => `Attack +${v}%`,
  },
  defence: {
    id: 'defence',
    icon: require('@/assets/images/skills/defence.webp'),
    maxLevel: 3,
    values: [3, 6, 10],
    prices: [0, 40, 120],
    minWave: 2,
    weight: 9,
    kind: 'mod',
    enabled: true,
    label: (v) => `Defence +${v}`,
  },
  maxHealth: {
    id: 'maxHealth',
    icon: require('@/assets/images/skills/max-health.webp'),
    maxLevel: 4,
    values: [40, 70, 100, 130],
    prices: [0, 150, 500, 1200],
    minWave: 2,
    weight: 9,
    kind: 'mod',
    enabled: true,
    label: (v) => `Max health +${v}%`,
  },
  heal: {
    id: 'heal',
    icon: require('@/assets/images/skills/heal.webp'),
    maxLevel: 3,
    values: [40, 90, 180],
    prices: [0, 60, 160],
    minWave: 2,
    weight: 8,
    kind: 'instant',
    enabled: true,
    label: (v) => `Heal +${v} HP`,
  },
  miss: {
    id: 'miss',
    icon: require('@/assets/images/skills/miss.webp'),
    maxLevel: 5,
    values: [20, 25, 30, 35, 40],
    prices: [0, 80, 200, 450, 900],
    minWave: 5,
    weight: 6,
    kind: 'mod',
    enabled: true,
    label: (v) => `Enemy miss chance +${v}%`,
  },
  crit: {
    id: 'crit',
    icon: require('@/assets/images/skills/crit.webp'),
    maxLevel: 4,
    values: [10, 18, 26, 35],
    prices: [0, 80, 200, 450],
    minWave: 5,
    weight: 6,
    kind: 'mod',
    enabled: true,
    label: (v) => `Crit chance +${v}%`,
  },
  lifesteal: {
    id: 'lifesteal',
    icon: require('@/assets/images/skills/lifesteal.webp'),
    maxLevel: 4,
    values: [8, 14, 20, 26],
    prices: [0, 90, 220, 500],
    minWave: 5,
    weight: 5,
    kind: 'mod',
    enabled: true,
    label: (v) => `Lifesteal +${v}%`,
  },
  balls: {
    id: 'balls',
    icon: require('@/assets/images/skills/balls.webp'),
    maxLevel: 3,
    values: [1, 2, 3],
    prices: [0, 70, 200],
    minWave: 5,
    weight: 5,
    kind: 'mod',
    enabled: true,
    label: (v) => `Balls per kill +${v}`,
  },
  extraTurn: {
    id: 'extraTurn',
    icon: require('@/assets/images/skills/extra-turn.webp'),
    maxLevel: 3,
    values: [20, 30, 40],
    prices: [0, 180, 450],
    minWave: 8,
    weight: 4,
    kind: 'mod',
    enabled: true,
    label: (v) => `Extra turn chance +${v}%`,
  },
  arrows: {
    id: 'arrows',
    icon: require('@/assets/images/skills/arrows.webp'),
    maxLevel: 2,
    values: [1, 2],
    prices: [0, 350],
    minWave: 8,
    weight: 3,
    kind: 'mod',
    enabled: true,
    label: (v) => `+${v} arrow${v > 1 ? 's' : ''} per attack`,
  },
  bomb: {
    id: 'bomb',
    icon: require('@/assets/images/skills/bomb.webp'),
    maxLevel: 3,
    values: [4, 7, 12],
    prices: [0, 130, 320],
    minWave: 8,
    weight: 4,
    kind: 'instant',
    enabled: true,
    label: (v) => `Bomb x${v} dmg to all`,
  },
  coins: {
    id: 'coins',
    icon: require('@/assets/images/skills/balls.webp'),
    maxLevel: 3,
    values: [20, 40, 60],
    prices: [0, 60, 180],
    minWave: 2,
    weight: 0,
    kind: 'mod',
    enabled: false,
    label: (v) => `Coin gain +${v}%`,
  },
};

/** Fixed damage multiplier a critical hit deals. */
export const CRIT_MULT = 2;

/** How many bonus hero turns one round can chain from `extraTurn`, regardless of how the rolls land. */
export const EXTRA_TURN_CAP = 2;

/** Effect value the player currently owns for a skill (0 = not owned). */
export function skillValue(id: SkillId, level: number): number {
  if (level <= 0) return 0;
  const def = SKILLS[id];
  return def.values[Math.min(level, def.maxLevel) - 1];
}

/** Ball price of the *next* level of a skill (the one a card sells). */
export function skillPrice(id: SkillId, level: number): number {
  const def = SKILLS[id];
  return def.prices[Math.min(level, def.maxLevel) - 1] ?? 0;
}

/** Card label for the level a card sells -- i.e. the value the player would own after buying. */
export function skillLabelAt(id: SkillId, level: number): string {
  const def = SKILLS[id];
  return def.label(skillValue(id, level));
}
