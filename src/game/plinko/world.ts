import { useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { PLINKO_TUNING, type PlinkoLayout } from '@/constants/plinko';
import { DEFAULT_PLINKO_LAYOUT } from '@/constants/plinko-layouts';

/**
 * The whole pachinko simulation state, as a flat bag of Reanimated shared
 * values. It MUST stay a plain object (not a class / Map) for the same reason
 * `GameClock` does -- Reanimated's `extractInputs` only recurses into
 * `Object.prototype` objects when it statically collects a worklet's reactive
 * dependencies from its `__closure`.
 *
 * The body data lives in structure-of-arrays form: one `number[]` per field,
 * length `poolSize`, indexed by pool slot. The solver mutates these arrays
 * **in place on the UI thread** and never reassigns `.value` -- the UI-side
 * copy of a shared value's array is mutable (only the JS-side original gets
 * dev-frozen after it's shared), and every worklet that touches the world
 * runs on the one UI runtime, so they see each other's writes. The renderer
 * doesn't need a wake signal from here -- its Atlas buffer mapper keys off
 * `clock.time` and re-reads these arrays every frame on its own.
 *
 * `liveList` holds the `liveCount` pool slots that are currently active;
 * `freeList` is a stack of the `freeCount` slots available to allocate. The
 * solver only ever iterates `liveList[0..liveCount)`, so cost tracks the
 * number of live balls, not `poolSize`.
 */
export type NumArr = SharedValue<number[]>;

export type PlinkoWorld = {
  // --- body SoA, length poolSize ---
  posX: NumArr;
  posY: NumArr;
  velX: NumArr;
  velY: NumArr;
  rot: NumArr;
  spin: NumArr;
  /** Seconds of ball-vs-ball immunity left after a boost-pad launch (0 = none). */
  launch: NumArr;
  /** Seconds this ball has been (near) motionless -- the solver drains it once
   * it crosses `STILL_LIMIT`, so a wedged ball can never hang the interlude. */
  still: NumArr;
  /** Render scale, 0 = parked/dead, eases 0->1 as a spawn pop-in. */
  scl: NumArr;
  /** Bitmask of gates this ball has already been multiplied by. */
  gateMask: NumArr;

  /** The board being played. Set by `startDrop` before the solver runs; the
   * step worklet reads `layout.value.{walls,gates,pad}` instead of module
   * constants, so each wave can hand it a different board. */
  layout: SharedValue<PlinkoLayout>;

  liveList: NumArr;
  freeList: NumArr;
  liveCount: SharedValue<number>;
  freeCount: SharedValue<number>;

  // --- uniform-grid broadphase scratch (see solver) ---
  gridCount: NumArr;
  grid: NumArr;

  // --- collision scratch, all rewritten every sub-step ---
  /** Out-param for `collideCircleWall`: [nx, ny, pen]. One shared buffer instead
   * of a result object per ball-vs-wall test (see `collision.ts`). */
  hit: NumArr;
  /** Per-wall `cos(a)` / `sin(a)` and squared broad-phase radius, primed once
   * per sub-step by the solver -- indexed by position in `layout.walls`. */
  wallCos: NumArr;
  wallSin: NumArr;
  wallBound: NumArr;

  // --- run state ---
  /** 1 while the solver should step, 0 when idle (nothing to simulate). */
  running: SharedValue<number>;
  stepAcc: SharedValue<number>;
  /** Balls still queued to drip out of the top cup. */
  spawnRemaining: SharedValue<number>;
  spawnAcc: SharedValue<number>;
  /** Player's aim x (top cup emit point). Written straight from the pan gesture worklet. */
  aimX: SharedValue<number>;
  /** 1 once the player has released and the pour has begun -- the top cup is frozen for the rest of this drop. */
  aimLocked: SharedValue<number>;

  /** 0 = armed, 1 = firing window open, 2 = spent. */
  boostState: SharedValue<number>;
  boostUntil: SharedValue<number>;

  collected: SharedValue<number>;
  /** Balls that would have been cloned past the live cap -- flushed to the counter as a visual burst. */
  overflow: SharedValue<number>;
  /** Monotonic count of multiplier-gate triggers. Purely an output for `use-plinko-sfx`, which
   * diffs it -- the simulation never reads it back. */
  gateHits: SharedValue<number>;

  rng: SharedValue<number>;

  // --- tuning scalars, seeded from PLINKO_TUNING (a JS write syncs to UI) ---
  cfgRadius: SharedValue<number>;
  cfgGravity: SharedValue<number>;
  cfgRestitution: SharedValue<number>;
  cfgLiveCap: SharedValue<number>;
  cfgBallBall: SharedValue<number>;
};

/** Ceiling on `layout.walls.length` -- sizes the per-wall scratch arrays. */
export const PLINKO_MAX_WALLS = 64;

const GRID_COLS = 20;
const GRID_ROWS = 44;
export const PLINKO_GRID = { cols: GRID_COLS, rows: GRID_ROWS, cell: PLINKO_TUNING.hashCell, maxPerCell: 8 } as const;

function zeros(n: number): number[] {
  return new Array(n).fill(0);
}

export function usePlinkoWorld(): PlinkoWorld {
  const n: number = PLINKO_TUNING.poolSize;
  const cells: number = GRID_COLS * GRID_ROWS;

  /* eslint-disable react-hooks/rules-of-hooks -- fixed key set, created once, never a loop over dynamic data */
  const fields = {
    posX: useSharedValue<number[]>(zeros(n)),
    posY: useSharedValue<number[]>(zeros(n)),
    velX: useSharedValue<number[]>(zeros(n)),
    velY: useSharedValue<number[]>(zeros(n)),
    rot: useSharedValue<number[]>(zeros(n)),
    spin: useSharedValue<number[]>(zeros(n)),
    launch: useSharedValue<number[]>(zeros(n)),
    still: useSharedValue<number[]>(zeros(n)),
    scl: useSharedValue<number[]>(zeros(n)),
    gateMask: useSharedValue<number[]>(zeros(n)),

    layout: useSharedValue<PlinkoLayout>(DEFAULT_PLINKO_LAYOUT),

    liveList: useSharedValue<number[]>(zeros(n)),
    freeList: useSharedValue<number[]>(Array.from({ length: n }, (_, i) => n - 1 - i)),
    liveCount: useSharedValue<number>(0),
    freeCount: useSharedValue<number>(n),

    gridCount: useSharedValue<number[]>(zeros(cells)),
    grid: useSharedValue<number[]>(zeros(cells * PLINKO_GRID.maxPerCell)),

    hit: useSharedValue<number[]>(zeros(4)),
    wallCos: useSharedValue<number[]>(zeros(PLINKO_MAX_WALLS)),
    wallSin: useSharedValue<number[]>(zeros(PLINKO_MAX_WALLS)),
    wallBound: useSharedValue<number[]>(zeros(PLINKO_MAX_WALLS)),

    running: useSharedValue<number>(0),
    stepAcc: useSharedValue<number>(0),
    spawnRemaining: useSharedValue<number>(0),
    spawnAcc: useSharedValue<number>(0),
    aimX: useSharedValue<number>(195),
    aimLocked: useSharedValue<number>(0),

    boostState: useSharedValue<number>(0),
    boostUntil: useSharedValue<number>(0),

    collected: useSharedValue<number>(0),
    overflow: useSharedValue<number>(0),
    gateHits: useSharedValue<number>(0),

    rng: useSharedValue<number>(0x9e3779b9),

    cfgRadius: useSharedValue<number>(PLINKO_TUNING.radius),
    cfgGravity: useSharedValue<number>(PLINKO_TUNING.gravity),
    cfgRestitution: useSharedValue<number>(PLINKO_TUNING.wallRestitution),
    cfgLiveCap: useSharedValue<number>(PLINKO_TUNING.liveCap),
    cfgBallBall: useSharedValue<number>(PLINKO_TUNING.ballBall ? 1 : 0),
  };
  /* eslint-enable react-hooks/rules-of-hooks */

  // Freeze a single object identity for the lifetime of the screen. Every
  // field is already a stable shared value; this just stops downstream
  // `useAnimatedReaction` / `useRSXformBuffer` closures from being rebuilt
  // each render because `world` changed reference.
  const ref = useRef<PlinkoWorld>(fields);
  return ref.current;
}

/**
 * Clears every body and counter back to a fresh run. Worklet -- call from the
 * UI thread (e.g. inside the runner's reaction) so it races nothing.
 */
export function resetPlinkoWorld(world: PlinkoWorld): void {
  'worklet';
  const n = world.posX.value.length;
  const free = world.freeList.value;
  const scl = world.scl.value;
  const mask = world.gateMask.value;
  const launch = world.launch.value;
  const still = world.still.value;
  for (let i = 0; i < n; i++) {
    free[i] = n - 1 - i;
    scl[i] = 0;
    mask[i] = 0;
    launch[i] = 0;
    still[i] = 0;
  }
  world.liveCount.value = 0;
  world.freeCount.value = n;
  world.stepAcc.value = 0;
  world.spawnAcc.value = 0;
  world.spawnRemaining.value = 0;
  world.boostState.value = 0;
  world.boostUntil.value = 0;
  world.collected.value = 0;
  world.overflow.value = 0;
  world.gateHits.value = 0;
  world.aimLocked.value = 0;
}
