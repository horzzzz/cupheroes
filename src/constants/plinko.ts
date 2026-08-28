/**
 * Geometry and tuning for the pachinko mini-game -- Figma node 1:1916,
 * design frame 390x844 (same `DesignFrame` as everything else).
 *
 * This is the single source of truth for the board: the collision solver
 * (`src/game/plinko/*`) and the renderer (`src/components/plinko/*`) both
 * read the same `PLINKO_WALLS` / `PLINKO_GATES` arrays, so a tweak here moves
 * the physics and the drawing together and they can't drift apart.
 *
 * Every wall was recovered from the Figma `get_design_context` CSS (resolved
 * on-screen rectangles), not the raw node transforms -- the deflectors and
 * funnel walls are rotated container frames whose raw x/y is pre-rotation and
 * misleading. See the plan doc for the derivation of each angle.
 *
 * All positions are design points. All durations/speeds are in game-clock
 * seconds / points-per-second, so the x2 button and pause apply for free
 * (the solver only ever advances by `GameClock` time -- see `clock.ts`).
 */

export const PlinkoFrame = {
  width: 390,
  height: 844,
} as const;

const D45 = Math.PI / 4;
const D75 = (Math.PI * 75) / 180;

/**
 * A static collider: an oriented, rounded box. `cx,cy` is the center, `hx,hy`
 * the half-extents along the box's own axes (local x = `(cos a, sin a)`,
 * local y = `(-sin a, cos a)`), `a` the rotation in radians, `r` the corner
 * radius. `hy` is usually the long axis (the bar's length).
 */
export type PlinkoWall = {
  id: string;
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  a: number;
  r: number;
};

export const PLINKO_WALLS: readonly PlinkoWall[] = [
  // Side walls (Figma 1:1934 / 1:1935) -- full-height, 20pt thick.
  { id: 'wall-l', cx: 10, cy: 422, hx: 10, hy: 422, a: 0, r: 2 },
  { id: 'wall-r', cx: 380, cy: 422, hx: 10, hy: 422, a: 0, r: 2 },
  // Vertical channel dividers (1:1936 / 1:1937 / 1:1938) -- 8pt bars.
  { id: 'div-a', cx: 148, cy: 304, hx: 4, hy: 40, a: 0, r: 4 },
  { id: 'div-b', cx: 97, cy: 452, hx: 4, hy: 64, a: 0, r: 4 },
  { id: 'div-c', cx: 278, cy: 373.5, hx: 4, hy: 109.5, a: 0, r: 4 },
  // Diagonal deflectors (1:1962 / 1:1961) -- "/" shaped, 8pt bars at +45deg.
  // A sits under the x2/x3 gate seam and shoves balls into the left channel;
  // B sits under divider C and does the same lower down.
  { id: 'defl-a', cx: 122.12, cy: 366.11, hx: 4, hy: 40, a: D45, r: 4 },
  { id: 'defl-b', cx: 252.11, cy: 505.11, hx: 4, hy: 40, a: D45, r: 4 },
  // V-funnel above the receiving cup (1:1939 / 1:1940) -- 20pt walls, +/-75deg,
  // leaving a ~56pt throat at x 167..223 directly over the bottom cup.
  { id: 'funnel-l', cx: 84.69, cy: 687.66, hx: 10, hy: 85, a: -D75, r: 4 },
  { id: 'funnel-r', cx: 305.31, cy: 687.66, hx: 10, hy: 85, a: D75, r: 4 },
] as const;

/**
 * A multiplier gate: an axis-aligned sensor band. A ball that enters the band
 * for the first time (tracked per-ball by `bit` in its `gateMask`) is cloned
 * into `mult` bodies. `channelMin/Max` is the x-range the gate actually
 * governs once the vertical dividers cut the row up -- used for the label and
 * for aiming, not for the physics test (which is the full `x0..x1`).
 */
export type PlinkoGate = {
  id: string;
  bit: number;
  mult: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  channelMin: number;
  channelMax: number;
  color: string;
};

export const PLINKO_GATES: readonly PlinkoGate[] = [
  { id: 'g-x2', bit: 1 << 0, mult: 2, x0: 16, x1: 148, y0: 289, y1: 314, channelMin: 20, channelMax: 144, color: '#A58F35' },
  { id: 'g-x3', bit: 1 << 1, mult: 3, x0: 148, x1: 280, y0: 289, y1: 314, channelMin: 152, channelMax: 274, color: '#A58F35' },
  { id: 'g-x4', bit: 1 << 2, mult: 4, x0: 278, x1: 374, y0: 289, y1: 314, channelMin: 282, channelMax: 370, color: '#83A835' },
  { id: 'g-x2b', bit: 1 << 3, mult: 2, x0: 278, x1: 374, y0: 427, y1: 452, channelMin: 282, channelMax: 370, color: '#A58F35' },
] as const;

/**
 * The one-shot boost pad (1:1931). While `armed`, the first ball to touch it
 * opens a firing window (`PLINKO_TUNING.boostWindow` game-seconds); every ball
 * that touches during the window is launched upward with a sideways kick and
 * has its `gateMask` wiped (so it can re-trigger the same gates). After the
 * window it is `dead` forever and balls pass straight through it.
 */
export const PLINKO_BOOST_PAD = { x0: 20, x1: 93, y0: 486, y1: 511 } as const;

/** Top (player-aimed) and bottom (fixed) cups. `emitX/emitY` is where balls
 * leave the top cup; `mouth` is the bottom cup's catch slit under the funnel
 * throat. Cup art is 172x94, drawn centered on the aim x. */
export const PLINKO_CUPS = {
  topArtWidth: 172,
  topArtHeight: 94,
  /** Red-cup center offset from the art's left edge (measured on the export) -- the aim x lands here. */
  redCupOffsetX: 134,
  emitY: 176,
  topY: 90,
  bottomY: 720,
  mouthX0: 166,
  mouthX1: 224,
  /** A ball is caught and counted (and instantly hidden) the moment it clears
   * the funnel throat -- the funnel walls' lower tips are at y~710, so this
   * sits just past them and above the cup rim. Catching here rather than deep
   * in the cup means balls never pile up and jostle back out of the art. */
  drainY: 712,
} as const;

/** How far the aim x can travel -- keeps the red cup clear of the side walls. */
export const PLINKO_AIM_RANGE = { min: 40, max: 350 } as const;

/**
 * Pool + step tuning. `radius` and `liveCap` start conservative (~20% board
 * fill) and are overridable live from the sandbox -- the ceiling before the
 * board jams is somewhere above this and has to be found on a device.
 */
export const PLINKO_TUNING = {
  poolSize: 512,
  liveCap: 320,
  radius: 8,

  fixedDt: 1 / 180,
  maxSubsteps: 8,
  gravity: 900,
  maxSpeed: 1150,
  airDrag: 0.003,

  wallRestitution: 0.42,
  /** Tangential loss on a wall hit, but scaled by how hard the hit is (see
   * solver) -- a ball merely resting/sliding on a steep funnel wall keeps
   * almost all its down-slope speed instead of creeping. */
  wallFriction: 0.06,
  ballRestitution: 0.18,
  /** A gate re-arms (forgets it multiplied this ball) once the ball is this
   * many points clear of the band center -- so a ball punched back up through
   * a multiplier it already used gets multiplied again. */
  gateRearmDist: 55,

  ballBall: true,
  /** Spatial-hash cell size -- a hair over one ball diameter. */
  hashCell: 20,

  /** Gap between successive balls leaving the top cup. */
  spawnInterval: 0.045,
  spawnSpeed: 90,
  spawnJitterX: 9,
  spawnJitterVx: 70,

  /** Clone scatter when a gate multiplies a ball. */
  cloneJitterX: 6,
  cloneJitterVx: 150,
  cloneJitterVy: 40,

  boostWindow: 0.45,
  /** A launched ball ignores ball-vs-ball for this long so it punches straight
   * through the crowd sitting above the pad instead of dumping its kick into
   * the pile (which cancelled the launch entirely with ball-vs-ball on). */
  boostImmunity: 0.22,
  boostVy: -880,
  boostVyJitter: 130,
  /** Every launched ball gets at least this much sideways kick (random L/R),
   * up to the max -- so the batch fans out instead of all going straight up. */
  boostVxMin: 130,
  boostVxMax: 430,
} as const;

export const PLINKO_COLORS = {
  wall: '#8DBD1B',
  boostPad: '#3FA9F5',
  gateLabel: '#FFFFFF',
} as const;

/** Board-fill diagnostic for picking `radius`/`liveCap`: fraction of the
 * playable area the live balls would cover. */
export function plinkoFillFraction(liveCount: number, radius: number): number {
  const playable = (PlinkoFrame.width - 40) * (PLINKO_CUPS.drainY - PLINKO_CUPS.emitY);
  return (liveCount * Math.PI * radius * radius) / playable;
}
