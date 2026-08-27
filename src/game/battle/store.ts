import { create } from 'zustand';

import { HeroBase, WAVE_COUNT, wavesEnemies } from '@/constants/battle';
import { resolveRound, type CombatEnemy, type Round } from '@/game/battle/combat';

export type BattlePhase = 'intro' | 'active' | 'wave-clear' | 'victory' | 'defeat';

type BattleState = {
  phase: BattlePhase;
  wave: number;
  heroHealth: number;
  heroMaxHealth: number;
  heroAttack: number;
  heroArmor: number;
  enemies: CombatEnemy[];
  /** Game-clock time each living enemy's current spawn/pop-in began, keyed by enemy id. */
  spawnedAt: Record<string, number>;
  balls: number;
  round: Round | null;
  wavesCompleted: number;

  /** Ends the intro run and spawns wave 1. */
  beginFirstWave: (gameTime: number) => void;
  /** Resolves one round of combat. No-op outside the 'active' phase. */
  advanceRound: (gameTime: number) => void;
  /** Spawns the next wave, or ends the run in victory past the last wave. No-op outside 'wave-clear'. */
  startNextWave: (gameTime: number) => void;
  /** Restores full HP and keeps fighting the current wave. No-op outside 'defeat'. */
  revive: () => void;
  /** Resets to a fresh intro, e.g. when re-entering the battle screen. */
  reset: () => void;
};

function spawnWave(wave: number, gameTime: number) {
  const enemies: CombatEnemy[] = wavesEnemies(wave).map((spec, i) => ({
    id: `w${wave}-${i}`,
    spec,
    health: spec.maxHealth,
    alive: true,
  }));
  const spawnedAt = Object.fromEntries(enemies.map((enemy) => [enemy.id, gameTime]));
  return { enemies, spawnedAt };
}

const initialState = {
  phase: 'intro' as BattlePhase,
  wave: 1,
  heroHealth: HeroBase.maxHealth,
  heroMaxHealth: HeroBase.maxHealth,
  heroAttack: HeroBase.attack,
  heroArmor: HeroBase.armor,
  enemies: [] as CombatEnemy[],
  spawnedAt: {} as Record<string, number>,
  balls: 0,
  round: null as Round | null,
  wavesCompleted: 0,
};

export const useBattleStore = create<BattleState>((set, get) => ({
  ...initialState,

  beginFirstWave: (gameTime) => {
    if (get().phase !== 'intro') return;
    set({ phase: 'active', wave: 1, round: null, ...spawnWave(1, gameTime) });
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
    const nextPhase: BattlePhase = resolution.heroDefeated ? 'defeat' : resolution.waveCleared ? 'wave-clear' : 'active';

    set({
      phase: nextPhase,
      heroHealth: resolution.heroHealthAfter,
      enemies: resolution.enemiesAfter,
      balls: state.balls + resolution.ballsGained,
      round,
      wavesCompleted: nextPhase === 'wave-clear' ? state.wavesCompleted + 1 : state.wavesCompleted,
    });
  },

  startNextWave: (gameTime) => {
    const state = get();
    if (state.phase !== 'wave-clear') return;

    if (state.wave >= WAVE_COUNT) {
      set({ phase: 'victory' });
      return;
    }

    const wave = state.wave + 1;
    set({ phase: 'active', wave, round: null, ...spawnWave(wave, gameTime) });
  },

  revive: () => {
    const state = get();
    if (state.phase !== 'defeat') return;
    set({ phase: 'active', heroHealth: state.heroMaxHealth, round: null });
  },

  reset: () => set({ ...initialState }),
}));
