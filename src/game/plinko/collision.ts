import type { PlinkoWall } from '@/constants/plinko';

/**
 * Worklet-safe collision primitives for the pachinko solver. No allocations,
 * no shared-value access -- pure number math so they can be called from any
 * worklet on the UI thread.
 *
 * "No allocations" is load-bearing, not a style note: at a full board this is
 * called ~8.6k times per rendered frame (live balls x walls x sub-steps), and
 * returning a `{nx, ny, pen}` result object from here was handing Hermes'
 * UI-thread GC tens of megabytes of garbage a second -- which is what the
 * visible stutter at high ball counts actually was. Results go out through a
 * caller-owned scratch array instead.
 */

export type WallHitOut = number[];

/**
 * Circle (px,py,r) vs a rounded oriented box. Writes the outward normal into
 * `out[0..1]` and the penetration depth into `out[2]`, and returns whether
 * there was a hit at all (`out` is untouched when there wasn't).
 *
 * `ca`/`sa` are `cos(w.a)`/`sin(w.a)`, precomputed by the caller once per
 * wall per sub-step -- the angles are static for the whole layout, so
 * recomputing them per ball was ~1M trig calls a second for nothing.
 *
 * Method: rotate the circle center into the box's local frame, clamp it to
 * the box's inner rectangle (extents shrunk by the corner radius), and treat
 * the leftover offset as the vector from the nearest surface point to the
 * center. If the center is *inside* the inner rectangle the offset is ~0, so
 * we eject along whichever local axis is the shallower way out.
 */
export function collideCircleWall(
  out: WallHitOut,
  px: number,
  py: number,
  r: number,
  w: PlinkoWall,
  ca: number,
  sa: number,
): boolean {
  'worklet';
  const dx = px - w.cx;
  const dy = py - w.cy;

  // World -> local: local x axis = (ca, sa), local y axis = (-sa, ca).
  const lx = dx * ca + dy * sa;
  const ly = -dx * sa + dy * ca;

  const ex = Math.max(w.hx - w.r, 0);
  const ey = Math.max(w.hy - w.r, 0);
  const qx = lx < -ex ? -ex : lx > ex ? ex : lx;
  const qy = ly < -ey ? -ey : ly > ey ? ey : ly;

  const ox = lx - qx;
  const oy = ly - qy;
  const d2 = ox * ox + oy * oy;
  const rr = r + w.r;

  if (d2 >= rr * rr) return false;

  let d = Math.sqrt(d2);
  let nlx: number;
  let nly: number;
  if (d > 1e-4) {
    nlx = ox / d;
    nly = oy / d;
  } else {
    // Center buried in the core -- push out the near face.
    const outX = ex - Math.abs(lx);
    const outY = ey - Math.abs(ly);
    if (outX < outY) {
      nlx = lx < 0 ? -1 : 1;
      nly = 0;
      d = -outX;
    } else {
      nlx = 0;
      nly = ly < 0 ? -1 : 1;
      d = -outY;
    }
  }

  out[0] = nlx * ca - nly * sa;
  out[1] = nlx * sa + nly * ca;
  out[2] = rr - d;
  return true;
}

/** Whether point (px,py) is inside an axis-aligned rect. */
export function pointInRect(px: number, py: number, x0: number, y0: number, x1: number, y1: number): boolean {
  'worklet';
  return px >= x0 && px <= x1 && py >= y0 && py <= y1;
}
