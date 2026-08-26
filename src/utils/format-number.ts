const UNITS = ['', 'K', 'M', 'B', 'T', 'Q'] as const;

/** One decimal at most, with a trailing `.0` dropped: 4 -> "4", 4.8 -> "4.8". */
function trim(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * Short form for stat and price numbers, which run into the hundreds of
 * millions by upgrade level 100 and have to fit inside a 100pt node.
 */
export function formatCompact(value: number): string {
  let scaled = value;
  let unit = 0;

  while (Math.abs(scaled) >= 1000 && unit < UNITS.length - 1) {
    scaled /= 1000;
    unit += 1;
  }

  return `${trim(scaled)}${UNITS[unit]}`;
}
