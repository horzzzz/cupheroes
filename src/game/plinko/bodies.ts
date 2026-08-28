import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * Pool allocation for pachinko balls, worklet-side. A body is a slot in the
 * structure-of-arrays; `liveList[0..liveCount)` are the active slots and
 * `freeList[0..freeCount)` a stack of slots ready to hand out. Releasing a
 * body is done in bulk by the solver's end-of-step compaction, not here.
 */

/**
 * Grabs a free slot, appends it to the live list and seeds its state.
 * Returns the pool index, or -1 when the pool is exhausted (caller should
 * treat that as "count it as overflow instead").
 */
export function allocBall(world: PlinkoWorld, x: number, y: number, vx: number, vy: number, mask: number): number {
  'worklet';
  const freeCount = world.freeCount.value;
  if (freeCount <= 0) return -1;

  const i = world.freeList.value[freeCount - 1];
  world.freeCount.value = freeCount - 1;

  const live = world.liveCount.value;
  world.liveList.value[live] = i;
  world.liveCount.value = live + 1;

  world.posX.value[i] = x;
  world.posY.value[i] = y;
  world.velX.value[i] = vx;
  world.velY.value[i] = vy;
  world.rot.value[i] = 0;
  world.spin.value[i] = 0;
  world.launch.value[i] = 0;
  world.still.value[i] = 0;
  world.scl.value[i] = 0.01; // eases up to 1 -- spawn pop-in
  world.gateMask.value[i] = mask;
  return i;
}
