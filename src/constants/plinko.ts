/**
 * Geometry and tuning for the pachinko mini-game -- Figma node 1:1916,
 * design frame 390x844 (same `DesignFrame` as everything else).
 *
 * This is the single source of truth for the board: the collision solver
 * (`src/game/plinko/*`) and the renderer (`src/components/plinko/*`) both
 * read the same layout objects (`PLINKO_SHELL_WALLS` + `PLINKO_LAYOUTS` in
 * `constants/plinko-layouts`), so a tweak moves the physics and the drawing
 * together and they can't drift apart.
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

/**
 * The fixed outer shell every board layout keeps: the two side walls and the
 * V-funnel over the throat (x 167..223). The receiving-cup catch in
 * `PLINKO_CUPS` depends on this funnel geometry, so a layout only ever varies
 * the middle of the board (see `PLINKO_LAYOUTS` in `constants/plinko-layouts`).
 */
export const PLINKO_SHELL_WALLS: readonly PlinkoWall[] = [
  // Side walls (Figma 1:1934 / 1:1935) -- full-height, 20pt thick.
  { id: 'wall-l', cx: 10, cy: 422, hx: 10, hy: 422, a: 0, r: 2 },
  { id: 'wall-r', cx: 380, cy: 422, hx: 10, hy: 422, a: 0, r: 2 },
  // V-funnel above the receiving cup (1:1939 / 1:1940) -- 20pt walls, +/-75deg,
  // leaving a ~56pt throat at x 167..223 directly over the bottom cup.
  { id: 'funnel-l', cx: 84.69, cy: 687.66, hx: 10, hy: 85, a: -D75, r: 4 },
  { id: 'funnel-r', cx: 305.31, cy: 687.66, hx: 10, hy: 85, a: D75, r: 4 },
] as const;

/** Re-exported so layout authoring can reuse the same diagonal angle. */
export const PLINKO_D45 = D45;

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

/**
 * The one-shot boost pad (1:1931). While `armed`, the first ball to touch it
 * opens a firing window (`PLINKO_TUNING.boostWindow` game-seconds); every ball
 * that touches during the window is launched upward with a sideways kick and
 * has its `gateMask` wiped (so it can re-trigger the same gates). After the
 * window it is `dead` forever and balls pass straight through it.
 *
 * A layout may omit it (`pad: null`).
 */
export type PlinkoPad = { x0: number; x1: number; y0: number; y1: number };

/**
 * One selectable board. The outer shell (`PLINKO_SHELL_WALLS`) is always
 * present; a layout supplies the middle obstacles, the multiplier gates and an
 * optional boost pad. See `constants/plinko-layouts.ts` for the pool and the
 * authoring constraints.
 */
export type PlinkoLayout = {
  id: string;
  /** Full wall list: `PLINKO_SHELL_WALLS` spread in first, then the layout's own middle obstacles. */
  walls: readonly PlinkoWall[];
  gates: readonly PlinkoGate[];
  pad: PlinkoPad | null;
};

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
  /** Default wall tint (chapter 1). Later chapters override it per location --
   * see `PlinkoBoard`'s `wallColor` prop and `constants/chapters`. */
  wall: '#8DBD1B',
  /** Matches the flat blue of `pad-boost.webp` so the panel can be widened with
   * a plain RoundedRect behind the (centred, unstretched) chevron art. */
  boostPad: '#00A5FF',
} as const;

/** Board-fill diagnostic for picking `radius`/`liveCap`: fraction of the
 * playable area the live balls would cover. */
export function plinkoFillFraction(liveCount: number, radius: number): number {
  const playable = (PlinkoFrame.width - 40) * (PLINKO_CUPS.drainY - PLINKO_CUPS.emitY);
  return (liveCount * Math.PI * radius * radius) / playable;
}
