/**
 * Balance validation harness -- plays whole runs against the *real* combat
 * code (`resolveRound`/`resolveBomb` in `combat.ts`, `rollOffers`/
 * `aggregateSkills` in `skills.ts`, `wavesEnemies` in `battle.ts`) instead of
 * a parallel reimplementation, so this can't silently drift from what the
 * game actually does. Run via `npm run balance` (see `scripts/ts-loader.mjs`
 * for how a plain `node` process imports these `.ts` files at all).
 *
 * Simplifications, both deliberate and both noted in the balance plan:
 *  - Pachinko itself isn't simulated. A wave's ball drop is multiplied by a
 *    flat `pachinkoMult` standing in for the board (2 = a poor drop/mostly
 *    x2 gates, 4 = typical, 8 = a great run through the high multipliers).
 *  - The draft AI is a single greedy strategy (see `pickOffer`), not a
 *    hand-tuned "weak/median/strong" set of profiles -- the pachinko-luck
 *    spread above stands in for build-quality spread instead.
 */
import {
  BOSS_WAVE,
  HeroBase,
  Timing,
  WAVE_COUNT,
  assignPackSlots,
  halvesInWave,
  packVisualScale,
  wavesEnemies,
} from '@/constants/battle';
import { SKILLS, skillValue } from '@/constants/skills';
import { UPGRADE_STEPS, applyUpgrades } from '@/constants/upgrades';
import { resolveBomb, resolveRound, type CombatEnemy, type CombatHero } from '@/game/battle/combat';
import { aggregateSkills, rollOffers, type OwnedSkills, type SkillOffer } from '@/game/battle/skills';

// Mulberry32 -- tiny, seedable, good enough for a balance sweep (not crypto).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A "reference" hero at `level`: `HeroBase` plus every ladder step below that level, bought in order -- the yardstick `wavesEnemies` scales enemies against. `levelDeficit` knocks the top N owned steps back off, for testing an under-levelled hero (acceptance criterion 6). */
function referenceHeroBase(level: number, levelDeficit = 0) {
  const owned: Record<string, true> = {};
  const climbOrder = [...UPGRADE_STEPS].reverse().filter((step) => step.level < level);
  const cut = Math.max(0, climbOrder.length - levelDeficit);
  for (const step of climbOrder.slice(0, cut)) owned[step.id] = true;
  return applyUpgrades(HeroBase, owned);
}

function heroStatsFrom(base: typeof HeroBase, owned: OwnedSkills) {
  const agg = aggregateSkills(owned);
  return {
    maxHealth: Math.round(base.maxHealth * agg.maxHealthMult),
    attack: Math.round(base.attack * agg.attackMult),
    armor: base.armor,
  };
}

function spawnHalf(wave: number, half: number, level: number): CombatEnemy[] {
  const specs = wavesEnemies(wave, half, level);
  const scale = packVisualScale(specs.length);
  const slots = assignPackSlots(specs);
  return specs.map((spec, i) => {
    const { slotIndex, slotX } = slots[i];
    return {
      id: `w${wave}-h${half}-${i}`,
      spec: { ...spec, visualScale: spec.visualScale * scale },
      health: spec.maxHealth,
      alive: true,
      slotIndex,
      slotX,
      steps: 0,
      standX: slotX,
    };
  });
}

/** Greedy draft AI: buy the cheapest affordable offer. `rollOffers` guarantees at least one offer is affordable whenever there are any offers at all. */
function pickOffer(offers: SkillOffer[], balls: number): SkillOffer | null {
  const affordable = offers.filter((o) => o.price <= balls).sort((a, b) => a.price - b.price);
  return affordable[0] ?? null;
}

const PACK_OVERHEAD =
  Timing.enemyEnterDelay + Timing.enemyEnter + Timing.packClear + Timing.packAdvance;

export type RunResult = {
  died: number | null; // null = victory
  timeSeconds: number;
  rounds: number;
  ballsSpent: number;
  ballsEarned: number;
  wave1DamageTaken: number;
  wave2Hits: { melee: number; ranged: number };
};

function simulateRun(level: number, pachinkoMult: number, rng: () => number, levelDeficit = 0): RunResult {
  const heroBase = referenceHeroBase(level, levelDeficit);
  let heroHealth: number = heroBase.maxHealth;
  let ownedSkills: OwnedSkills = {};
  let balls = 0;
  let ballsEarned = 0;
  let ballsSpent = 0;
  let wavePot = 0;
  let time = 0;
  let rounds = 0;
  let wave1Damage = 0;
  const wave2Hits = { melee: 0, ranged: 0 };

  for (let wave = 1; wave <= WAVE_COUNT; wave += 1) {
    const halves = halvesInWave(wave);
    for (let half = 0; half < halves; half += 1) {
      let enemies = spawnHalf(wave, half, level);

      if (half === 0 && wave > 1) {
        const collected = Math.round(wavePot * pachinkoMult);
        balls += collected;
        ballsEarned += collected;
        wavePot = 0;

        const offers = rollOffers(wave, ownedSkills, balls, rng);
        const pick = offers.length > 0 ? pickOffer(offers, balls) : null;
        if (pick) {
          ownedSkills = { ...ownedSkills, [pick.id]: pick.level };
          const stats = heroStatsFrom(heroBase, ownedSkills);
          const healthDelta = Math.max(0, stats.maxHealth - heroHealth);
          heroHealth = Math.min(stats.maxHealth, heroHealth + healthDelta);
          ballsSpent += pick.price;
          balls -= pick.price;

          if (SKILLS[pick.id].kind === 'instant') {
            const value = skillValue(pick.id, pick.level);
            if (pick.id === 'heal') {
              heroHealth = Math.min(stats.maxHealth, heroHealth + Math.round(stats.maxHealth * (value / 100)));
            } else if (pick.id === 'bomb') {
              const blast = resolveBomb(stats.attack, value, enemies, 0);
              enemies = blast.enemiesAfter;
              wavePot += blast.ballsGained;
            }
          }
        }
      }

      let t = 0;
      while (enemies.some((e) => e.alive) && heroHealth > 0) {
        const agg = aggregateSkills(ownedSkills);
        const stats = heroStatsFrom(heroBase, ownedSkills);
        const hero: CombatHero = { health: heroHealth, maxHealth: stats.maxHealth, attack: stats.attack, armor: stats.armor };
        const res = resolveRound(hero, enemies, t, agg.combat, rng);

        if (wave === 1) wave1Damage += hero.health - res.heroHealthAfter;
        if (wave === 2) {
          for (const beat of res.beats) {
            if (beat.kind !== 'attack' || beat.attackerId === 'hero' || beat.missed) continue;
            const attacker = enemies.find((e) => e.id === beat.attackerId);
            if (attacker) wave2Hits[attacker.spec.range === 'melee' ? 'melee' : 'ranged'] += 1;
          }
        }

        heroHealth = res.heroHealthAfter;
        enemies = res.enemiesAfter;
        wavePot += res.ballsGained;
        t += res.duration;
        rounds += 1;
        if (res.heroDefeated) break;
      }

      time += t + PACK_OVERHEAD;
      if (heroHealth <= 0) {
        return { died: wave, timeSeconds: time, rounds, ballsSpent, ballsEarned, wave1DamageTaken: wave1Damage, wave2Hits };
      }
    }
  }

  return { died: null, timeSeconds: time, rounds, ballsSpent, ballsEarned, wave1DamageTaken: wave1Damage, wave2Hits };
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const N_RUNS = 400;
const LEVELS = [1, 5, 10, 20];
const PACHINKO_SCENARIOS: readonly [string, number][] = [
  ['poor (x2)', 2],
  ['typical (x4)', 4],
  ['great (x8)', 8],
];

function runBatch(level: number, pachinkoMult: number, levelDeficit = 0) {
  const results: RunResult[] = [];
  for (let i = 0; i < N_RUNS; i += 1) {
    const rng = mulberry32(level * 1_000_003 + Math.round(pachinkoMult * 97) + i + levelDeficit * 31);
    results.push(simulateRun(level, pachinkoMult, rng, levelDeficit));
  }
  return results;
}

function summarize(results: RunResult[]) {
  const deaths = results.filter((r) => r.died !== null);
  const wins = results.filter((r) => r.died === null);
  return {
    winRate: wins.length / results.length,
    medianDeathWave: deaths.length ? median(deaths.map((r) => r.died!)) : null,
    avgTimeMin: results.reduce((s, r) => s + r.timeSeconds, 0) / results.length / 60,
    avgRounds: results.reduce((s, r) => s + r.rounds, 0) / results.length,
    avgBallsEarned: results.reduce((s, r) => s + r.ballsEarned, 0) / results.length,
    avgBallsSpent: results.reduce((s, r) => s + r.ballsSpent, 0) / results.length,
  };
}

console.log('=== Balance harness ===\n');

console.log('--- Criteria 1-2: wave 1 zero damage, wave 2 melee/ranged hit counts (level 1, typical luck) ---');
{
  const results = runBatch(1, 4);
  const totalWave1Damage = results.reduce((s, r) => s + r.wave1DamageTaken, 0);
  const meleeHits = results.reduce((s, r) => s + r.wave2Hits.melee, 0) / results.length;
  const rangedHits = results.reduce((s, r) => s + r.wave2Hits.ranged, 0) / results.length;
  console.log(`wave 1 total damage across ${N_RUNS} runs: ${totalWave1Damage} (want 0)`);
  console.log(`wave 2 avg landed hits -- melee: ${meleeHits.toFixed(2)} (want ~1), ranged: ${rangedHits.toFixed(2)} (want ~2)`);
}

console.log('\n--- Criteria 3-4, 7: win rate / pacing by level and pachinko luck ---');
for (const level of LEVELS) {
  for (const [label, mult] of PACHINKO_SCENARIOS) {
    const s = summarize(runBatch(level, mult));
    console.log(
      `level ${String(level).padStart(2)} | ${label.padEnd(12)} | win% ${(s.winRate * 100).toFixed(0).padStart(3)}` +
        ` | median death wave ${s.medianDeathWave ?? '-'} | time x1 ${s.avgTimeMin.toFixed(1)}m` +
        ` | rounds ${s.avgRounds.toFixed(0)} | balls earned ${s.avgBallsEarned.toFixed(0)} spent ${s.avgBallsSpent.toFixed(0)}`,
    );
  }
}

console.log('\n--- Criterion 6: under-levelled hero (level 10, missing the top 6 ladder steps, typical luck) ---');
{
  const s = summarize(runBatch(10, 4, 6));
  console.log(
    `level 10 minus 6 steps | win% ${(s.winRate * 100).toFixed(0)} | median death wave ${s.medianDeathWave ?? '-'}`,
  );
}

console.log('\nDone.');
