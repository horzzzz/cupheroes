import type { PlinkoWall } from '@/constants/plinko';

/**
 * Worklet-safe collision primitives for the pachinko solver. No allocations,
 * no shared-value access -- pure number math so they can be called from any
 * worklet on the UI thread.
 */

/** Deterministic xorshift32 in [0,1). Advances and stores `state` back. */
export function rand01(state: number): { value: number; next: number } {
  'worklet';
  let x = state | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const n = x | 0;
  return { value: (n >>> 0) / 4294967296, next: n };
}

export type WallHit = {
  hit: boolean;
  /** Outward unit normal (world space) and penetration depth. */
  nx: number;
  ny: number;
  pen: number;
};

const NO_HIT: WallHit = { hit: false, nx: 0, ny: 0, pen: 0 };

/**
 * Circle (px,py,r) vs a rounded oriented box. Returns the outward normal and
 * how far the circle has penetrated the box's rounded surface.
 *
 * Method: rotate the circle center into the box's local frame, clamp it to
 * the box's inner rectangle (extents shrunk by the corner radius), and treat
 * the leftover offset as the vector from the nearest surface point to the
 * center. If the center is *inside* the inner rectangle the offset is ~0, so
 * we eject along whichever local axis is the shallower way out.
 */
export function collideCircleWall(px: number, py: number, r: number, w: PlinkoWall): WallHit {
  'worklet';
  const ca = Math.cos(w.a);
  const sa = Math.sin(w.a);
  const dx = px - w.cx;
  const dy = py - w.cy;

  // World -> local: local x axis = (ca, sa), local y axis = (-sa, ca).
  const lx = dx * ca + dy * sa;
  const ly = -dx * sa + dy * ca;

  const ex = Math.max(w.hx - w.r, 0);
  const ey = Math.max(w.hy - w.r, 0);
  const qx = lx < -ex ? -ex : lx > ex ? ex : lx;
  const qy = ly < -ey ? -ey : ly > ey ? ey : ly;

  let ox = lx - qx;
  let oy = ly - qy;
  const d2 = ox * ox + oy * oy;
  const rr = r + w.r;

  if (d2 >= rr * rr) return NO_HIT;

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
    ox = 0;
    oy = 0;
  }

  return {
    hit: true,
    nx: nlx * ca - nly * sa,
    ny: nlx * sa + nly * ca,
    pen: rr - d,
  };
}

/** Whether point (px,py) is inside an axis-aligned rect. */
export function pointInRect(px: number, py: number, x0: number, y0: number, x1: number, y1: number): boolean {
  'worklet';
  return px >= x0 && px <= x1 && py >= y0 && py <= y1;
}
