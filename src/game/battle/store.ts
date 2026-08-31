import { create } from 'zustand';

import {
  HERO_POS,
  HeroBase,
  Timing,
  WAVE_COUNT,
  assignPackSlots,
  halvesInWave,
  packVisualScale,
  wavesEnemies,
} from '@/constants/battle';
import { shufflePlinkoOrder } from '@/constants/plinko-layouts';
import { SKILLS, skillValue } from '@/constants/skills';
import { applyUpgrades } from '@/constants/upgrades';
import type { Reward } from '@/constants/economy';
import { impactAt, resolveBomb, resolveRound, type Beat, type CombatEnemy, type Round } from '@/game/battle/combat';
import { runReward } from '@/game/battle/rewards';
import { aggregateSkills, rollOffers, type OwnedSkills, type SkillOffer } from '@/game/battle/skills';
import { levelFromXp } from '@/game/economy/level';
import { useEconomyStore } from '@/game/economy/store';

/**
 * `intro` (hero runs in) -> `enemies-in` (this pack's enemies run in from the
 * right) -> `active` (rounds resolve) -> `clear` (pack's dead, brief pause)
 * -> `advancing` (hero walks forward, background pans) -> back to
 * `enemies-in` for the wave's second half or the next wave's first, or
 * `victory` once the last wave's last half falls. `active` can interrupt
 * into `dying` at any round instead.
 *
 * `dying` plays the hero's own death animation (the same fade/drop/smoke/
 * skull every enemy gets -- see `battle-actors.tsx`'s `heroDiedAt` and
 * `components/battle/vfx/death-vfx.tsx`) with the clock still running --
 * unlike every other terminal phase, `battle.tsx` deliberately does *not*
 * pause the clock here. `finishDefeat` moves on to `defeat` (which does
 * pause) once that animation, plus a short real hold, has played out.
 *
 * `plinko` is the between-waves interlude: once a new wave's first pack has
 * run in (`finishEntering` with `half === 0 && wave > 1`), combat holds here
 * -- the battle screen pans the camera down to the pachinko board -- until
 * the board clears. Then `draft` (Figma 1:1310): the player spends the balls
 * they collected on one skill card, and buying it releases combat.
 */
export type BattlePhase =
  | 'intro'
  | 'enemies-in'
  | 'active'
  | 'clear'
  | 'advancing'
  | 'plinko'
  | 'draft'
  | 'victory'
  | 'dying'
  | 'defeat';

/** Ball price of a manual re-roll on the draft screen (Figma copy says "REFRESH 50", lowered per the balance plan to ~2/3 of a typical wave's ball drop now that skill prices are higher). */
export const DRAFT_REFRESH_COST = 30;

/** Real-time gap between tapping a card and combat resuming, so the overlay clears first. */
const DRAFT_EXIT_DELAY_MS = 450;

type BattleState = {
  phase: BattlePhase;
  wave: number;
  /** 0-indexed pack within the current wave -- 0 or 1, per `halvesInWave`. */
  half: number;
  /** Sequential count of every pack spawned this run, -1 before the first. Drives the background's pan. */
  packIndex: number;
  /** `HeroBase` folded with owned upgrade-ladder steps -- snapshotted once per run by `reset`, not live-reactive to mid-run purchases (there aren't any). */
  heroBase: typeof HeroBase;
  /** Player level (from lifetime XP) at the moment this run started -- what `wavesEnemies` scales enemies against. Snapshotted like `heroBase`. */
  heroLevel: number;
  heroHealth: number;
  heroMaxHealth: number;
  heroAttack: number;
  heroArmor: number;
  enemies: CombatEnemy[];
  /** Game-clock time each living enemy's run-in began, keyed by enemy id -- staggered per enemy. */
  enteredAt: Record<string, number>;
  /** Balls dropped by this wave's kills, waiting to be poured through the next pachinko board. */
  wavePot: number;
  /** The player's spendable balls -- survives across waves, spent on the draft. */
  balls: number;
  /** Skill levels owned this run. Wiped by `reset`. */
  ownedSkills: OwnedSkills;
  /** The three cards the current draft offers, or null outside `draft`. */
  offers: SkillOffer[] | null;
  round: Round | null;
  /** Per-run shuffle of the pachinko board pool -- see `plinkoLayoutForWave`. Re-rolled by `reset`. */
  plinkoOrder: number[];
  /** The chapter this run belongs to -- snapshotted from the economy store by
   * `reset`, so winning (which bumps the economy chapter) doesn't restyle the
   * battle mid-victory-screen. Drives background, enemy art and panel colour. */
  chapter: number;
  wavesCompleted: number;
  /** Coins/gems/xp granted for the run that just ended -- null mid-run. Read by the victory/defeat overlays. */
  lastReward: Reward | null;
  /** Game-clock time the hero's killing blow landed, set only while `phase === 'dying'` -- the same
   * shape as `CombatEnemy.diedAt`, fed to `BattleActors` so the hero fades out with the identical
   * death animation an enemy gets. Undefined outside `dying`/`defeat`. */
  heroDiedAt?: number;

  /** Ends the intro run and spawns wave 1's first pack. No-op outside 'intro'. */
  beginFirstWave: (gameTime: number) => void;
  /** Ends the current pack's run-in once every enemy has arrived. No-op outside 'enemies-in'. */
  finishEntering: (gameTime: number) => void;
  /** Resolves one round of combat. No-op outside the 'active' phase. */
  advanceRound: (gameTime: number) => void;
  /** Moves the hero on from its own death animation to the `defeat` overlay. No-op outside 'dying'. */
  finishDefeat: () => void;
  /** Moves on from the pack-clear pause to the hero's walk-forward. No-op outside 'clear'. */
  startAdvance: (gameTime: number) => void;
  /** Spawns the wave's other half, the next wave's first pack, or ends the run in victory. No-op outside 'advancing'. */
  startNextPack: (gameTime: number) => void;
  /** Ends the pachinko interlude and opens the skill draft with `collected` balls banked. No-op outside 'plinko'. */
  enterDraft: (collected: number) => void;
  /** Buys card `index`, applies it, and releases combat. No-op outside 'draft' or (unless `free`) if unaffordable. `free` is the rewarded-ad path -- the ad has already been watched. */
  buySkill: (index: number, gameTime: number, free?: boolean) => void;
  /** Takes every current offer at once for free (rewarded-ad "GET ALL"), then releases combat. No-op outside 'draft'. */
  claimAllOffers: (gameTime: number) => void;
  /** Re-rolls the three cards for `DRAFT_REFRESH_COST` balls. No-op outside 'draft' or if unaffordable. */
  refreshOffers: () => void;
  /** Restores full HP and keeps fighting the current pack. No-op outside 'defeat'. */
  revive: () => void;
  /** Resets to a fresh intro, e.g. when re-entering the battle screen. */
  reset: () => void;
};

type PackSpawn = Pick<BattleState, 'phase' | 'wave' | 'half' | 'packIndex' | 'enemies' | 'enteredAt' | 'round'>;

function spawnPack(wave: number, half: number, packIndex: number, level: number, gameTime: number): PackSpawn {
  const specs = wavesEnemies(wave, half, level);
  const scale = packVisualScale(specs.length);
  const slots = assignPackSlots(specs);

  const enemies: CombatEnemy[] = specs.map((spec, i) => {
    const { slotIndex, slotX } = slots[i];
    return {
      id: `w${wave}-h${half}-${i}`,
      spec: { ...spec, visualScale: spec.visualScale * scale },
      health: spec.maxHealth,
      alive: true,
      slotIndex,
      slotX,
      steps: 0,
      // Nothing has moved yet -- a melee enemy's approach is driven entirely
      // by `resolveRound` closing the gap turn by turn from here.
      standX: slotX,
    };
  });
  // Staggered by final left-to-right position (not composition order) so the
  // pack reads as entering in a line, not out of visual order.
  const enteredAt = Object.fromEntries(
    enemies.map((enemy) => [enemy.id, gameTime + Timing.enemyEnterDelay + enemy.slotIndex * Timing.enemyEnterStagger]),
  );
  return { phase: 'enemies-in', wave, half, packIndex, enemies, enteredAt, round: null };
}

/** Hero stats derived from a meta base (`HeroBase` + owned upgrade-ladder steps) + owned run skills -- recomputed on every purchase, never mutated in place. `defence` is a combat-time damage reduction now (see `skills.ts`), not a flat armor bonus, so armor itself only ever comes from the ladder. */
function heroStatsFrom(base: typeof HeroBase, owned: OwnedSkills) {
  const agg = aggregateSkills(owned);
  return {
    heroMaxHealth: Math.round(base.maxHealth * agg.maxHealthMult),
    heroAttack: Math.round(base.attack * agg.attackMult),
    heroArmor: base.armor,
  };
}

/** Snapshot of `HeroBase` folded with whatever upgrade-ladder steps are owned right now. */
function currentHeroBase(): typeof HeroBase {
  return applyUpgrades(HeroBase, useEconomyStore.getState().ownedUpgrades);
}

/**
 * A brand-new run's starting state, re-derived from whatever upgrade-ladder
 * steps are owned right now -- not a static snapshot -- so a purchase made
 * in the upgrades tab shows up the next time `reset()` runs (battle.tsx
 * calls it on every mount).
 */
function freshState() {
  const heroBase = currentHeroBase();
  const heroLevel = levelFromXp(useEconomyStore.getState().xp).level;
  const chapter = useEconomyStore.getState().chapter;
  return {
    phase: 'intro' as BattlePhase,
    wave: 1,
    half: 0,
    packIndex: -1,
    heroBase,
    heroLevel,
    heroHealth: heroBase.maxHealth,
    heroMaxHealth: heroBase.maxHealth,
    heroAttack: heroBase.attack,
    heroArmor: heroBase.armor,
    enemies: [] as CombatEnemy[],
    enteredAt: {} as Record<string, number>,
    wavePot: 0,
    balls: 0,
    ownedSkills: {} as OwnedSkills,
    offers: null as SkillOffer[] | null,
    round: null as Round | null,
    plinkoOrder: shufflePlinkoOrder(),
    chapter,
    wavesCompleted: 0,
    lastReward: null as Reward | null,
    heroDiedAt: undefined as number | undefined,
  };
}

export const useBattleStore = create<BattleState>((set, get) => ({
  ...freshState(),

  beginFirstWave: (gameTime) => {
    const state = get();
    if (state.phase !== 'intro') return;
    set(spawnPack(1, 0, state.packIndex + 1, state.heroLevel, gameTime));
  },

  finishEntering: () => {
    const state = get();
    if (state.phase !== 'enemies-in') return;
    // Every wave after the first opens with the pachinko interlude, once its
    // first pack has finished running in. The battle screen watches for this
    // phase, pans down to the board, and drives the draft when it clears.
    if (state.half === 0 && state.wave > 1) {
      set({ phase: 'plinko' });
      return;
    }
    set({ phase: 'active' });
  },

  advanceRound: (gameTime) => {
    const state = get();
    if (state.phase !== 'active') return;

    const resolution = resolveRound(
      { health: state.heroHealth, maxHealth: state.heroMaxHealth, attack: state.heroAttack, armor: state.heroArmor },
      state.enemies,
      gameTime,
      aggregateSkills(state.ownedSkills).combat,
    );

    const round: Round = {
      index: (state.round?.index ?? 0) + 1,
      startedAt: gameTime,
      beats: resolution.beats,
      duration: resolution.duration,
    };
    // 'defeat' itself waits on 'dying' -- see `finishDefeat` -- so the hero's
    // own death animation gets to play before the overlay appears.
    const nextPhase: BattlePhase = resolution.heroDefeated ? 'dying' : resolution.waveCleared ? 'clear' : 'active';

    // Reward pays out for whatever waves were fully cleared before this one --
    // the wave in progress never counts, same as the old summary screen's
    // "waves completed" readout. Granted the instant defeat is decided (not
    // once 'dying' finishes) so nothing about the wallet depends on how long
    // the death animation takes.
    let lastReward = state.lastReward;
    if (nextPhase === 'dying') {
      lastReward = runReward(state.wavesCompleted, false, state.heroLevel);
      useEconomyStore.getState().grant(lastReward);
    }

    // The killing blow's own impact time -- the last lethal hit on the hero,
    // consistent with how `combat.ts` sets an enemy's `diedAt`.
    const heroDiedAt =
      nextPhase === 'dying'
        ? resolution.beats.reduce<number | undefined>((latest, beat) => {
            if (beat.kind !== 'attack' || beat.targetId !== 'hero' || !beat.lethal) return latest;
            const at = impactAt(beat);
            return latest === undefined || at > latest ? at : latest;
          }, undefined)
        : undefined;

    set({
      phase: nextPhase,
      heroHealth: resolution.heroHealthAfter,
      enemies: resolution.enemiesAfter,
      wavePot: state.wavePot + resolution.ballsGained,
      round,
      lastReward,
      heroDiedAt,
    });
  },

  finishDefeat: () => {
    const state = get();
    if (state.phase !== 'dying') return;
    set({ phase: 'defeat' });
  },

  startAdvance: () => {
    const state = get();
    if (state.phase !== 'clear') return;
    // Bumping `packIndex` here, not once the walk finishes, is what makes
    // the background start panning the moment the hero starts walking --
    // `BattleBackground` keys its pan target directly off this field, and
    // both it and the hero's run pose share `Timing.packAdvance` as their
    // duration, so they finish in step too.
    set({ phase: 'advancing', packIndex: state.packIndex + 1 });
  },

  startNextPack: (gameTime) => {
    const state = get();
    if (state.phase !== 'advancing') return;

    const isLastHalf = state.half + 1 >= halvesInWave(state.wave);
    if (!isLastHalf) {
      set(spawnPack(state.wave, state.half + 1, state.packIndex, state.heroLevel, gameTime));
      return;
    }

    if (state.wave >= WAVE_COUNT) {
      const wavesCompleted = state.wavesCompleted + 1;
      const reward = runReward(wavesCompleted, true, state.heroLevel);
      useEconomyStore.getState().grant(reward);
      // Chapter advances only on a full clear. `state.chapter` (this run's
      // snapshot) is untouched, so the victory screen keeps this chapter's look.
      useEconomyStore.getState().advanceChapter();
      set({ phase: 'victory', wavesCompleted, lastReward: reward });
      return;
    }

    set({
      wavesCompleted: state.wavesCompleted + 1,
      ...spawnPack(state.wave + 1, 0, state.packIndex, state.heroLevel, gameTime),
    });
  },

  enterDraft: (collected) => {
    const state = get();
    if (state.phase !== 'plinko') return;
    const balls = state.balls + Math.max(0, Math.round(collected));
    const offers = rollOffers(state.wave, state.ownedSkills, balls);
    // Nothing left to offer (every unlocked skill maxed) -- skip the draft
    // rather than show an empty screen the player can't leave.
    if (offers.length === 0) {
      set({ phase: 'active', balls, wavePot: 0 });
      return;
    }
    set({ phase: 'draft', balls, wavePot: 0, offers });
  },

  buySkill: (index, gameTime, free = false) => {
    const state = get();
    if (state.phase !== 'draft' || !state.offers) return;
    const offer = state.offers[index];
    if (!offer || (!free && offer.price > state.balls)) return;
    applyDraftPurchase(set, get, state, [offer], gameTime, free ? 0 : offer.price);
  },

  claimAllOffers: (gameTime) => {
    const state = get();
    if (state.phase !== 'draft' || !state.offers || state.offers.length === 0) return;
    applyDraftPurchase(set, get, state, state.offers, gameTime, 0);
  },

  refreshOffers: () => {
    const state = get();
    if (state.phase !== 'draft' || state.balls < DRAFT_REFRESH_COST) return;
    const balls = state.balls - DRAFT_REFRESH_COST;
    set({ balls, offers: rollOffers(state.wave, state.ownedSkills, balls) });
  },

  revive: () => {
    const state = get();
    if (state.phase !== 'defeat') return;
    // Clears `heroDiedAt` too -- otherwise `computeActorLayout` would still
    // see a (long-expired) death timestamp and render the hero permanently
    // faded out post-revive.
    set({ phase: 'active', heroHealth: state.heroMaxHealth, round: null, heroDiedAt: undefined });
  },

  reset: () => set({ ...freshState() }),
}));

/**
 * Folds one or more draft offers into the run and releases combat -- the
 * shared body of `buySkill` (one card) and `claimAllOffers` (the rewarded-ad
 * "GET ALL"). `ballsSpent` is deducted from the stash (0 for the ad paths).
 *
 * Stats are recomputed once from the fully-merged skill set, then each
 * `instant` offer's effect (heal / bomb) is applied in order against those
 * final stats.
 */
function applyDraftPurchase(
  set: (partial: Partial<BattleState>) => void,
  get: () => BattleState,
  state: BattleState,
  offers: readonly SkillOffer[],
  gameTime: number,
  ballsSpent: number,
) {
  const ownedSkills: OwnedSkills = { ...state.ownedSkills };
  for (const offer of offers) ownedSkills[offer.id] = offer.level;

  const stats = heroStatsFrom(state.heroBase, ownedSkills);
  const healthDelta = Math.max(0, stats.heroMaxHealth - state.heroMaxHealth);

  let heroHealth = Math.min(stats.heroMaxHealth, state.heroHealth + healthDelta);
  let enemies = state.enemies;
  let wavePot = state.wavePot;
  let round = state.round;

  for (const offer of offers) {
    if (SKILLS[offer.id].kind !== 'instant') continue;
    const value = skillValue(offer.id, offer.level);
    if (offer.id === 'heal') {
      const amount = Math.min(
        Math.round(stats.heroMaxHealth * (value / 100)),
        stats.heroMaxHealth - heroHealth,
      );
      if (amount > 0) {
        heroHealth += amount;
        round = syntheticRound(round, gameTime, [
          {
            kind: 'heal',
            targetId: 'hero',
            amount,
            targetHealthAfter: heroHealth,
            targetX: HERO_POS.x,
            startAt: gameTime,
          },
        ]);
      }
    } else if (offer.id === 'bomb') {
      const blast = resolveBomb(stats.heroAttack, value, enemies, gameTime);
      enemies = blast.enemiesAfter;
      wavePot += blast.ballsGained;
      round = syntheticRound(round, gameTime, blast.beats);
    }
  }

  set({
    ownedSkills,
    ...stats,
    heroHealth,
    enemies,
    wavePot,
    round,
    balls: state.balls - ballsSpent,
    // Clear the cards but stay in 'draft' for a short beat so the overlay
    // dismisses before the hero starts swinging.
    offers: null,
  });
  setTimeout(() => {
    if (get().phase === 'draft') set({ phase: 'active' });
  }, DRAFT_EXIT_DELAY_MS);
}

function syntheticRound(prev: Round | null, gameTime: number, beats: Beat[]): Round {
  // Duration is never read for a synthetic round -- the scheduler isn't
  // driving 'draft', and the next real `advanceRound` (fired the instant
  // `buySkill`'s timeout flips the phase back to 'active') replaces it
  // before anything schedules off it.
  return { index: (prev?.index ?? 0) + 1, startedAt: gameTime, beats, duration: 0 };
}

/** 0..1 fraction of the current wave cleared -- both halves' worth, not just the pack on screen. */
export function waveProgress(state: Pick<BattleState, 'wave' | 'half' | 'enemies'>): number {
  const total = halvesInWave(state.wave);
  const killedFraction =
    state.enemies.length > 0 ? state.enemies.filter((enemy) => !enemy.alive).length / state.enemies.length : 0;
  return Math.min(1, (state.half + killedFraction) / total);
}

/**
 * What the HUD ball counter shows:
 * - fighting: `wavePot` -- balls this wave's kills have dropped, waiting for the next pachinko;
 * - pachinko / draft: `balls` -- the spendable stash the draft pulls from.
 */
export function displayBalls(state: Pick<BattleState, 'balls' | 'wavePot' | 'phase'>): number {
  return state.phase === 'plinko' || state.phase === 'draft' ? state.balls : state.wavePot;
}

/** Whether a card is affordable right now -- drives the red price + ad button on the draft screen. */
export function canAfford(offer: SkillOffer, balls: number): boolean {
  return offer.price <= balls;
}
