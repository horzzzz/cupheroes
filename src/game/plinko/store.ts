import { create } from 'zustand';

/**
 * Thin UI-facing mirror of the pachinko run. The simulation itself lives
 * entirely in shared values on the UI thread (`PlinkoWorld`); this store only
 * carries what React needs to render the HUD and drive the phase, kept in
 * sync by a low-frequency poll in `usePlinkoRunner` (not the physics hot
 * path).
 *
 * `idle` -> `dropping` (balls in play) -> `done` (board clear, queue empty).
 * The battle -> pachinko interlude calls `startDrop`, which drops straight
 * into `dropping`.
 */
export type PlinkoPhase = 'idle' | 'dropping' | 'done';

type PlinkoState = {
  phase: PlinkoPhase;
  /** Balls caught by the bottom cup, including the overflow burst. */
  collected: number;
  /** Currently live bodies. */
  live: number;
  /** Balls still queued to drip from the top cup. */
  remaining: number;
  /** Total balls this drop was seeded with. */
  dropTotal: number;

  setPhase: (phase: PlinkoPhase) => void;
  syncCounts: (collected: number, live: number, remaining: number) => void;
  beginDrop: (total: number) => void;
  reset: () => void;
};

const initialState = {
  phase: 'idle' as PlinkoPhase,
  collected: 0,
  live: 0,
  remaining: 0,
  dropTotal: 0,
};

export const usePlinkoStore = create<PlinkoState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  syncCounts: (collected, live, remaining) => set({ collected, live, remaining }),
  beginDrop: (total) => set({ phase: 'dropping', dropTotal: total, collected: 0, live: 0, remaining: total }),
  reset: () => set({ ...initialState }),
}));
