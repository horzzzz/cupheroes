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
  // Tier 1 (from wave 2) -- level 1 is free on every tier-1 skill, per design.
  attack: {
    id: 'attack',
    icon: require('@/assets/images/skills/attack.webp'),
    maxLevel: 3,
    values: [25, 50, 100],
    prices: [0, 135, 378],
    minWave: 2,
    weight: 10,
    kind: 'mod',
    enabled: true,
    label: (v) => `Attack +${v}%`,
  },
  // A damage-reduction percentage now, not a flat armor bonus -- a flat
  // number stops mattering once enemy hits scale to percent-of-health, see
  // the balance plan.
  defence: {
    id: 'defence',
    icon: require('@/assets/images/skills/defence.webp'),
    maxLevel: 3,
    values: [10, 20, 30],
    prices: [0, 171, 441],
    minWave: 2,
    weight: 9,
    kind: 'mod',
    enabled: true,
    label: (v) => `Damage taken -${v}%`,
  },
  maxHealth: {
    id: 'maxHealth',
    icon: require('@/assets/images/skills/max-health.webp'),
    maxLevel: 3,
    values: [35, 70, 100],
    prices: [0, 207, 513],
    minWave: 2,
    weight: 9,
    kind: 'mod',
    enabled: true,
    label: (v) => `Max health +${v}%`,
  },
  // A percentage of max health now, not a flat HP amount -- same reasoning as `defence`.
  heal: {
    id: 'heal',
    icon: require('@/assets/images/skills/heal.webp'),
    maxLevel: 3,
    values: [20, 35, 55],
    prices: [0, 153, 405],
    minWave: 2,
    weight: 8,
    kind: 'instant',
    enabled: true,
    label: (v) => `Heal +${v}% HP`,
  },
  // Tier 2 (from wave 5) -- no free level; these are strictly stronger than tier 1.
  miss: {
    id: 'miss',
    icon: require('@/assets/images/skills/miss.webp'),
    maxLevel: 3,
    values: [15, 30, 45],
    prices: [144, 342, 738],
    minWave: 5,
    weight: 6,
    kind: 'mod',
    enabled: true,
    label: (v) => `Enemy miss chance +${v}%`,
  },
  crit: {
    id: 'crit',
    icon: require('@/assets/images/skills/crit.webp'),
    maxLevel: 3,
    values: [15, 30, 45],
    prices: [126, 315, 684],
    minWave: 5,
    weight: 6,
    kind: 'mod',
    enabled: true,
    label: (v) => `Crit chance +${v}%`,
  },
  // Capped in the single digits -- the hero's own hit already removes ~10%
  // of its max health from an enemy per swing, so lifesteal compounds fast;
  // see the balance plan.
  lifesteal: {
    id: 'lifesteal',
    icon: require('@/assets/images/skills/lifesteal.webp'),
    maxLevel: 3,
    values: [15, 30, 45],
    prices: [153, 369, 1000],
    minWave: 5,
    weight: 5,
    kind: 'mod',
    enabled: true,
    label: (v) => `Lifesteal +${v}%`,
  },
  balls: {
    id: 'balls',
    icon: require('@/assets/images/skills/balls.webp'),
    maxLevel: 2,
    values: [1, 2],
    prices: [87, 125],
    minWave: 5,
    weight: 5,
    kind: 'mod',
    enabled: true,
    label: (v) => `Balls per kill +${v}`,
  },
  // Tier 3 (from wave 8) -- the run's strongest, priciest skills.
  extraTurn: {
    id: 'extraTurn',
    icon: require('@/assets/images/skills/extra-turn.webp'),
    maxLevel: 2,
    values: [15, 30],
    prices: [342, 738],
    minWave: 8,
    weight: 4,
    kind: 'mod',
    enabled: true,
    label: (v) => `Extra turn chance +${v}%`,
  },
  // One level only: an extra volley target, at reduced damage
  // (`ARROW_SPLASH_MULT` in `game/battle/skills.ts`) -- does nothing against
  // a lone boss, so it can't single-handedly decide a run the way an
  // unconditional damage multiplier would.
  arrows: {
    id: 'arrows',
    icon: require('@/assets/images/skills/arrows.webp'),
    maxLevel: 1,
    values: [1],
    prices: [400],
    minWave: 8,
    weight: 3,
    kind: 'mod',
    enabled: true,
    label: () => `+1 arrow, 2nd target`,
  },
  bomb: {
    id: 'bomb',
    icon: require('@/assets/images/skills/bomb.webp'),
    maxLevel: 2,
    values: [1.5, 2.5],
    prices: [252, 567],
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
    prices: [0, 108, 324],
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
export const EXTRA_TURN_CAP = 1;

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
