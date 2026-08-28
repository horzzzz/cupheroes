import { create } from 'zustand';

import {
  HeroBase,
  Timing,
  WAVE_COUNT,
  assignPackSlots,
  halvesInWave,
  packVisualScale,
  wavesEnemies,
} from '@/constants/battle';
import { resolveRound, type CombatEnemy, type Round } from '@/game/battle/combat';

/**
 * `intro` (hero runs in) -> `enemies-in` (this pack's enemies run in from the
 * right) -> `active` (rounds resolve) -> `clear` (pack's dead, brief pause)
 * -> `advancing` (hero walks forward, background pans) -> back to
 * `enemies-in` for the wave's second half or the next wave's first, or
 * `victory` once the last wave's last half falls. `defeat` can interrupt
 * `active` at any round.
 *
 * `plinko` is the between-waves interlude: once a new wave's first pack has
 * run in (`finishEntering` with `half === 0 && wave > 1`), combat holds here
 * -- the battle screen pans the camera down to the pachinko board -- until
 * `resumeFromPlinko` releases it into `active`.
 */
export type BattlePhase =
  | 'intro'
  | 'enemies-in'
  | 'active'
  | 'clear'
  | 'advancing'
  | 'plinko'
  | 'victory'
  | 'defeat';

type BattleState = {
  phase: BattlePhase;
  wave: number;
  /** 0-indexed pack within the current wave -- 0 or 1, per `halvesInWave`. */
  half: number;
  /** Sequential count of every pack spawned this run, -1 before the first. Drives the background's pan. */
  packIndex: number;
  heroHealth: number;
  heroMaxHealth: number;
  heroAttack: number;
  heroArmor: number;
  enemies: CombatEnemy[];
  /** Game-clock time each living enemy's run-in began, keyed by enemy id -- staggered per enemy. */
  enteredAt: Record<string, number>;
  balls: number;
  round: Round | null;
  wavesCompleted: number;

  /** Ends the intro run and spawns wave 1's first pack. No-op outside 'intro'. */
  beginFirstWave: (gameTime: number) => void;
  /** Ends the current pack's run-in once every enemy has arrived. No-op outside 'enemies-in'. */
  finishEntering: (gameTime: number) => void;
  /** Resolves one round of combat. No-op outside the 'active' phase. */
  advanceRound: (gameTime: number) => void;
  /** Moves on from the pack-clear pause to the hero's walk-forward. No-op outside 'clear'. */
  startAdvance: (gameTime: number) => void;
  /** Spawns the wave's other half, the next wave's first pack, or ends the run in victory. No-op outside 'advancing'. */
  startNextPack: (gameTime: number) => void;
  /** Ends the between-waves pachinko interlude and starts the fight. No-op outside 'plinko'. */
  resumeFromPlinko: () => void;
  /** Restores full HP and keeps fighting the current pack. No-op outside 'defeat'. */
  revive: () => void;
  /** Resets to a fresh intro, e.g. when re-entering the battle screen. */
  reset: () => void;
};

type PackSpawn = Pick<BattleState, 'phase' | 'wave' | 'half' | 'packIndex' | 'enemies' | 'enteredAt' | 'round'>;

function spawnPack(wave: number, half: number, packIndex: number, gameTime: number): PackSpawn {
  const specs = wavesEnemies(wave);
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

const initialState = {
  phase: 'intro' as BattlePhase,
  wave: 1,
  half: 0,
  packIndex: -1,
  heroHealth: HeroBase.maxHealth,
  heroMaxHealth: HeroBase.maxHealth,
  heroAttack: HeroBase.attack,
  heroArmor: HeroBase.armor,
  enemies: [] as CombatEnemy[],
  enteredAt: {} as Record<string, number>,
  balls: 0,
  round: null as Round | null,
  wavesCompleted: 0,
};

export const useBattleStore = create<BattleState>((set, get) => ({
  ...initialState,

  beginFirstWave: (gameTime) => {
    const state = get();
    if (state.phase !== 'intro') return;
    set(spawnPack(1, 0, state.packIndex + 1, gameTime));
  },

  finishEntering: () => {
    const state = get();
    if (state.phase !== 'enemies-in') return;
    // Every wave after the first opens with the pachinko interlude, once its
    // first pack has finished running in. The battle screen watches for this
    // phase, pans down to the board, and calls `resumeFromPlinko` when done.
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
    );

    const round: Round = { index: (state.round?.index ?? 0) + 1, startedAt: gameTime, beats: resolution.beats };
    const nextPhase: BattlePhase = resolution.heroDefeated ? 'defeat' : resolution.waveCleared ? 'clear' : 'active';

    set({
      phase: nextPhase,
      heroHealth: resolution.heroHealthAfter,
      enemies: resolution.enemiesAfter,
      balls: state.balls + resolution.ballsGained,
      round,
    });
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
      set(spawnPack(state.wave, state.half + 1, state.packIndex, gameTime));
      return;
    }

    if (state.wave >= WAVE_COUNT) {
      set({ phase: 'victory', wavesCompleted: state.wavesCompleted + 1 });
      return;
    }

    set({ wavesCompleted: state.wavesCompleted + 1, ...spawnPack(state.wave + 1, 0, state.packIndex, gameTime) });
  },

  resumeFromPlinko: () => {
    if (get().phase !== 'plinko') return;
    set({ phase: 'active' });
  },

  revive: () => {
    const state = get();
    if (state.phase !== 'defeat') return;
    set({ phase: 'active', heroHealth: state.heroMaxHealth, round: null });
  },

  reset: () => set({ ...initialState }),
}));

/** 0..1 fraction of the current wave cleared -- both halves' worth, not just the pack on screen. */
export function waveProgress(state: Pick<BattleState, 'wave' | 'half' | 'enemies'>): number {
  const total = halvesInWave(state.wave);
  const killedFraction =
    state.enemies.length > 0 ? state.enemies.filter((enemy) => !enemy.alive).length / state.enemies.length : 0;
  return Math.min(1, (state.half + killedFraction) / total);
}
