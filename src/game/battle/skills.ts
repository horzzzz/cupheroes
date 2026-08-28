import {
  CRIT_MULT,
  EXTRA_TURN_CAP,
  SKILLS,
  skillPrice,
  skillValue,
  type SkillId,
} from '@/constants/skills';

/**
 * Turns an owned-skills map into the numbers the rest of the battle needs,
 * and rolls the three cards a draft offers. No React, no store, no clock --
 * same shape as `combat.ts`, so it can be exercised offline.
 */

/** How many levels of each skill the player owns this run. Absent key = level 0. */
export type OwnedSkills = Partial<Record<SkillId, number>>;

/** One card in a draft: which skill, which level it sells, and its ball price. */
export type SkillOffer = {
  id: SkillId;
  /** Level the player would own after buying -- `owned + 1`. */
  level: number;
  price: number;
};

/** Per-round combat effects -- consumed by `resolveRound`. Stat buffs (attack/health/armor) are applied to the hero in the store, not here. */
export type CombatMods = {
  enemyMissChance: number;
  critChance: number;
  critMult: number;
  extraTurnChance: number;
  extraTurnCap: number;
  /** Total hero attack beats per turn -- 1 with no `arrows` skill. */
  arrows: number;
  /** Fraction of damage the hero deals that heals it back. */
  lifesteal: number;
  bonusBallsPerKill: number;
};

export const NO_MODS: CombatMods = {
  enemyMissChance: 0,
  critChance: 0,
  critMult: CRIT_MULT,
  extraTurnChance: 0,
  extraTurnCap: EXTRA_TURN_CAP,
  arrows: 1,
  lifesteal: 0,
  bonusBallsPerKill: 0,
};

export type AggregatedSkills = {
  /** Multiply `HeroBase.attack` by this. */
  attackMult: number;
  /** Multiply `HeroBase.maxHealth` by this. */
  maxHealthMult: number;
  /** Add to `HeroBase.armor`. */
  bonusArmor: number;
  combat: CombatMods;
};

export function aggregateSkills(owned: OwnedSkills): AggregatedSkills {
  const lvl = (id: SkillId) => owned[id] ?? 0;
  const val = (id: SkillId) => skillValue(id, lvl(id));

  return {
    attackMult: 1 + val('attack') / 100,
    maxHealthMult: 1 + val('maxHealth') / 100,
    bonusArmor: val('defence'),
    combat: {
      ...NO_MODS,
      enemyMissChance: val('miss') / 100,
      critChance: val('crit') / 100,
      extraTurnChance: val('extraTurn') / 100,
      arrows: 1 + val('arrows'),
      lifesteal: val('lifesteal') / 100,
      bonusBallsPerKill: val('balls'),
    },
  };
}

/** Skills that could still be offered at `wave` given what's already owned. */
function candidates(wave: number, owned: OwnedSkills): SkillId[] {
  return (Object.keys(SKILLS) as SkillId[]).filter((id) => {
    const def = SKILLS[id];
    return def.enabled && wave >= def.minWave && (owned[id] ?? 0) < def.maxLevel;
  });
}

function weightedPick(pool: SkillId[], rng: () => number): SkillId {
  const total = pool.reduce((sum, id) => sum + SKILLS[id].weight, 0);
  let roll = rng() * total;
  for (const id of pool) {
    roll -= SKILLS[id].weight;
    if (roll <= 0) return id;
  }
  return pool[pool.length - 1];
}

/**
 * Three distinct cards for a draft. Weighted by skill tier so early waves
 * lean on the cheap skills. Guarantees at least one card the player can
 * afford: if every roll came out too expensive, the cheapest is forced to
 * free -- the design has no "skip" button, so a draft must always be
 * completable (mirrors the mocked screen, where the middle card is FREE).
 */
export function rollOffers(
  wave: number,
  owned: OwnedSkills,
  balls: number,
  rng: () => number = Math.random,
): SkillOffer[] {
  const pool = candidates(wave, owned);
  const chosen: SkillId[] = [];

  while (chosen.length < 3 && chosen.length < pool.length) {
    const remaining = pool.filter((id) => !chosen.includes(id));
    chosen.push(weightedPick(remaining, rng));
  }

  const offers = chosen.map<SkillOffer>((id) => {
    const level = (owned[id] ?? 0) + 1;
    return { id, level, price: skillPrice(id, level) };
  });

  if (offers.length > 0 && !offers.some((o) => o.price <= balls)) {
    const cheapest = offers.reduce((a, b) => (b.price < a.price ? b : a));
    cheapest.price = 0;
  }

  return offers;
}
