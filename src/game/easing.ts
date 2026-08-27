/**
 * Worklet-safe easing and timeline helpers, shared by every battle animation
 * (and, later, the pachinko renderer). No allocations, no closures over
 * anything but numbers -- these run once per actor per frame. Each function
 * carries its own `'worklet'` directive so the Babel plugin can ship it to
 * the UI thread regardless of which worklet calls it.
 */

export function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  'worklet';
  const p = t - 1;
  return p * p * p + 1;
}

export function easeInCubic(t: number): number {
  'worklet';
  return t * t * t;
}

export function easeOutBack(t: number): number {
  'worklet';
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

/** 0 -> 1 -> 0 hump peaking at t=0.5, for a lunge-and-return attack move. */
export function pingPong(t: number): number {
  'worklet';
  const c = clamp01(t);
  return c < 0.5 ? easeOutCubic(c * 2) : 1 - easeInCubic((c - 0.5) * 2);
}

/** How far into a [startAt, startAt + duration] window `now` falls, clamped to [0,1]. */
export function timelineProgress(now: number, startAt: number, duration: number): number {
  'worklet';
  if (duration <= 0) return now >= startAt ? 1 : 0;
  return clamp01((now - startAt) / duration);
}

/** Whether `now` falls inside [startAt, startAt + duration). */
export function isActiveWindow(now: number, startAt: number, duration: number): boolean {
  'worklet';
  return now >= startAt && now < startAt + duration;
}
