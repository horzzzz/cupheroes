import { PLINKO_CUPS, PLINKO_TUNING, PlinkoFrame } from '@/constants/plinko';
import { allocBall } from '@/game/plinko/bodies';
import { collideCircleWall, pointInRect, rand01 } from '@/game/plinko/collision';
import { PLINKO_GRID, type PlinkoWorld } from '@/game/plinko/world';

/**
 * The pachinko physics step. `stepPlinko` advances the world by exactly one
 * fixed sub-step; the runner calls it 0..N times per rendered frame off an
 * accumulator fed by `GameClock` time, so pause and x2 fall out for free
 * (x2 just means the accumulator hands out twice as many sub-steps).
 *
 * Everything here is one worklet running on the UI thread. It only iterates
 * `liveList[0..liveCount)`, so cost tracks the number of live balls, never
 * `poolSize`.
 *
 * Lifecycle within a step: integrate + resolve every live ball (a drained or
 * lost ball is flagged by `scl = 0`, not removed yet; gate clones are
 * appended past the snapshot so they wait for the next step), then one
 * compaction pass rebuilds the live list and returns dead slots to the free
 * list, then ball-vs-ball runs on the survivors.
 */

export function nextRand(world: PlinkoWorld): number {
  'worklet';
  const r = rand01(world.rng.value);
  world.rng.value = r.next;
  return r.value;
}

/** Symmetric random in [-m, m]. */
function jitter(world: PlinkoWorld, m: number): number {
  'worklet';
  return (nextRand(world) * 2 - 1) * m;
}

const SUBSTEP_DT = PLINKO_TUNING.fixedDt;
const SCALE_EASE = 6; // scl eases to 1 at this rate/second (spawn pop-in)
const DEAD = 0; // scl sentinel for "counted / lost, compact me out"

// Stuck-ball watchdog: a body that stays below STILL_SPEED for STILL_LIMIT
// game-seconds is wedged (bad geometry, a jam, resting out of the drain path).
// It's counted and removed so `liveCount` always reaches 0 and the interlude
// can hand over to the skill draft instead of waiting forever.
const STILL_SPEED2 = 34 * 34;
const STILL_LIMIT = 2.2;

export function stepPlinko(world: PlinkoWorld, now: number): void {
  'worklet';
  const dt = SUBSTEP_DT;

  const radius = world.cfgRadius.value;
  const gravity = world.cfgGravity.value;
  const wallRestitution = world.cfgRestitution.value;
  const liveCap = world.cfgLiveCap.value;
  const ballBall = world.cfgBallBall.value > 0.5;

  const px = world.posX.value;
  const py = world.posY.value;
  const vx = world.velX.value;
  const vy = world.velY.value;
  const launchArr = world.launch.value;
  const stillArr = world.still.value;
  const scl = world.scl.value;
  const mask = world.gateMask.value;
  const live = world.liveList.value;
  const freeArr = world.freeList.value;

  const layout = world.layout.value;
  const walls = layout.walls;
  const gates = layout.gates;
  const pad = layout.pad;

  const drag = 1 - PLINKO_TUNING.airDrag;
  const maxSpeed = PLINKO_TUNING.maxSpeed;

  // --- drip new balls from the top cup ----------------------------------
  world.spawnAcc.value += dt;
  while (
    world.spawnAcc.value >= PLINKO_TUNING.spawnInterval &&
    world.spawnRemaining.value > 0 &&
    world.liveCount.value < liveCap
  ) {
    world.spawnAcc.value -= PLINKO_TUNING.spawnInterval;
    world.spawnRemaining.value -= 1;
    allocBall(
      world,
      world.aimX.value + jitter(world, PLINKO_TUNING.spawnJitterX),
      PLINKO_CUPS.emitY,
      jitter(world, PLINKO_TUNING.spawnJitterVx),
      PLINKO_TUNING.spawnSpeed,
      0,
    );
  }

  // --- integrate + static collisions -----------------------------------
  const n0 = world.liveCount.value; // snapshot: clones appended past here wait a step

  for (let k = 0; k < n0; k++) {
    const i = live[k];

    let x = px[i];
    let y = py[i];
    let ux = vx[i];
    let uy = vy[i];

    uy += gravity * dt;
    ux *= drag;
    uy *= drag;

    const sp2 = ux * ux + uy * uy;
    if (sp2 > maxSpeed * maxSpeed) {
      const s = maxSpeed / Math.sqrt(sp2);
      ux *= s;
      uy *= s;
    }

    x += ux * dt;
    y += uy * dt;

    // Walls.
    for (let w = 0; w < walls.length; w++) {
      const hit = collideCircleWall(x, y, radius, walls[w]);
      if (!hit.hit) continue;

      x += hit.nx * hit.pen;
      y += hit.ny * hit.pen;

      const vn = ux * hit.nx + uy * hit.ny;
      if (vn < 0) {
        ux -= (1 + wallRestitution) * vn * hit.nx;
        uy -= (1 + wallRestitution) * vn * hit.ny;
        // Friction proportional to impact hardness: a ball sliding down a
        // steep funnel wall barely penetrates per sub-step (-vn tiny), so it
        // keeps its down-slope speed; a ball slamming in loses real energy.
        const fr = PLINKO_TUNING.wallFriction * Math.min(1, -vn * 0.005);
        const dot = ux * hit.nx + uy * hit.ny;
        const tx = ux - dot * hit.nx;
        const ty = uy - dot * hit.ny;
        ux -= tx * fr;
        uy -= ty * fr;
      }
    }

    // Multiplier gates -- clone into `mult` bodies. The per-ball `bit` stops a
    // double-count while the ball is passing through (or wobbling near) the
    // band; it re-arms once the ball is well clear, so a ball bounced or
    // boosted back up through a gate it already used gets multiplied again.
    for (let g = 0; g < gates.length; g++) {
      const gate = gates[g];
      const bandCy = (gate.y0 + gate.y1) * 0.5;
      if (y < bandCy - PLINKO_TUNING.gateRearmDist || y > bandCy + PLINKO_TUNING.gateRearmDist) {
        mask[i] &= ~gate.bit;
        continue;
      }
      if (mask[i] & gate.bit) continue;
      if (!pointInRect(x, y, gate.x0, gate.y0, gate.x1, gate.y1)) continue;

      mask[i] |= gate.bit;
      for (let c = 1; c < gate.mult; c++) {
        if (world.liveCount.value >= liveCap) {
          world.overflow.value += 1;
          continue;
        }
        allocBall(
          world,
          x + jitter(world, PLINKO_TUNING.cloneJitterX),
          y,
          ux + jitter(world, PLINKO_TUNING.cloneJitterVx),
          uy + Math.abs(jitter(world, PLINKO_TUNING.cloneJitterVy)),
          mask[i],
        );
      }
    }

    // Boost pad -- one-shot trampoline. Skipped entirely on layouts without one.
    if (
      pad !== null &&
      world.boostState.value < 2 &&
      pointInRect(x, y, pad.x0, pad.y0, pad.x1, pad.y1)
    ) {
      if (world.boostState.value === 0) {
        world.boostState.value = 1;
        world.boostUntil.value = now + PLINKO_TUNING.boostWindow;
      }
      if (world.boostState.value === 1 && now <= world.boostUntil.value) {
        uy = PLINKO_TUNING.boostVy + jitter(world, PLINKO_TUNING.boostVyJitter);
        const dir = nextRand(world) < 0.5 ? -1 : 1;
        ux = dir * (PLINKO_TUNING.boostVxMin + nextRand(world) * (PLINKO_TUNING.boostVxMax - PLINKO_TUNING.boostVxMin));
        mask[i] = 0; // wipe gate memory -- can re-multiply
        // Lift clear of the pad (so it isn't re-fired next sub-step) with a
        // little vertical scatter so a whole boosted batch isn't colinear.
        y = pad.y0 - radius - 1 - nextRand(world) * 6;
        launchArr[i] = PLINKO_TUNING.boostImmunity;
      }
    }

    if (launchArr[i] > 0) launchArr[i] -= dt;
    if (scl[i] < 1) scl[i] = Math.min(1, scl[i] + SCALE_EASE * dt);

    // Wedged-ball timer: reset the moment it's moving, otherwise accrue.
    if (ux * ux + uy * uy > STILL_SPEED2) stillArr[i] = 0;
    else stillArr[i] += dt;

    px[i] = x;
    py[i] = y;
    vx[i] = ux;
    vy[i] = uy;

    // Caught by the cup, lost off-board, or wedged past the watchdog limit
    // -> flag for compaction. A wedged ball still counts toward the haul.
    if (y > PLINKO_CUPS.drainY || stillArr[i] > STILL_LIMIT) {
      world.collected.value += 1;
      scl[i] = DEAD;
      py[i] = -2000;
    } else if (y > PlinkoFrame.height + 40 || x < -40 || x > PlinkoFrame.width + 40) {
      scl[i] = DEAD;
      py[i] = -2000;
    }
  }

  if (world.boostState.value === 1 && now > world.boostUntil.value) {
    world.boostState.value = 2;
  }

  // --- compaction: rebuild live list, recycle dead slots ---------------
  const total = world.liveCount.value;
  let wIdx = 0;
  for (let k = 0; k < total; k++) {
    const i = live[k];
    if (scl[i] === DEAD) {
      freeArr[world.freeCount.value] = i;
      world.freeCount.value += 1;
    } else {
      live[wIdx] = i;
      wIdx += 1;
    }
  }
  world.liveCount.value = wIdx;

  // --- ball vs ball via uniform grid ---------------------------------
  if (ballBall && wIdx > 1) {
    const cols = PLINKO_GRID.cols;
    const rows = PLINKO_GRID.rows;
    const cell = PLINKO_GRID.cell;
    const per = PLINKO_GRID.maxPerCell;
    const gc = world.gridCount.value;
    const grid = world.grid.value;

    for (let c = 0; c < cols * rows; c++) gc[c] = 0;

    for (let k = 0; k < wIdx; k++) {
      const i = live[k];
      let cx = (px[i] / cell) | 0;
      let cy = (py[i] / cell) | 0;
      if (cx < 0) cx = 0;
      else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0;
      else if (cy >= rows) cy = rows - 1;
      const c = cx + cy * cols;
      if (gc[c] < per) {
        grid[c * per + gc[c]] = i;
        gc[c] += 1;
      }
    }

    const diam = radius * 2;
    for (let k = 0; k < wIdx; k++) {
      const i = live[k];
      let cx = (px[i] / cell) | 0;
      let cy = (py[i] / cell) | 0;
      if (cx < 0) cx = 0;
      else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0;
      else if (cy >= rows) cy = rows - 1;

      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        if (gy < 0 || gy >= rows) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= cols) continue;
          const c = gx + gy * cols;
          const count = gc[c];
          for (let s = 0; s < count; s++) {
            const j = grid[c * per + s];
            if (j <= i) continue;
            // A ball still in its post-launch window plows through the crowd
            // untouched -- otherwise the pile above the pad eats the kick.
            if (launchArr[i] > 0 || launchArr[j] > 0) continue;

            const dx = px[j] - px[i];
            const dy = py[j] - py[i];
            const d2 = dx * dx + dy * dy;
            if (d2 >= diam * diam || d2 < 1e-6) continue;

            const d = Math.sqrt(d2);
            const nrmX = dx / d;
            const nrmY = dy / d;
            const push = (diam - d) * 0.5;
            px[i] -= nrmX * push;
            py[i] -= nrmY * push;
            px[j] += nrmX * push;
            py[j] += nrmY * push;

            const rvn = (vx[j] - vx[i]) * nrmX + (vy[j] - vy[i]) * nrmY;
            if (rvn < 0) {
              const imp = (1 + PLINKO_TUNING.ballRestitution) * rvn * 0.5;
              vx[i] += imp * nrmX;
              vy[i] += imp * nrmY;
              vx[j] -= imp * nrmX;
              vy[j] -= imp * nrmY;
            }
          }
        }
      }
    }
  }
}
