/**
 * Pure helpers for the daily-bonus streak (Figma nodes 1:781 / 1:958).
 *
 * A "day" is a local calendar date. The reward table repeats every 7 days;
 * from day 8 on every day is worth 250 coins and the popup just keeps
 * counting ("day 8", "day 9", ...) a week at a time.
 */

/** Coins for days 1..7. Index 0 === day 1. */
export const REWARD_CYCLE = [50, 100, 150, 250, 100, 150, 250] as const;

/** Coins awarded for a given 1-based streak day. Day >= 8 is always 250. */
export function rewardForDay(day: number): number {
  if (day <= 7) return REWARD_CYCLE[day - 1];
  return 250;
}

/** First (1-based) day of the 7-day table that contains `day`. */
export function weekStartDay(day: number): number {
  return Math.floor((Math.max(1, day) - 1) / 7) * 7 + 1;
}

/** `YYYY-MM-DD` in the device's local time zone. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `key` shifted by `n` calendar days, still `YYYY-MM-DD` local. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + n));
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** `"11h 18m"` from a millisecond span (floored, clamped at 0). */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}
