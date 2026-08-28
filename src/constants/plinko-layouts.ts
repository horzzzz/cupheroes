/**
 * The pool of pachinko boards. One is picked per between-waves interlude; the
 * pool is shuffled once per run (`shufflePlinkoOrder`, seeded into the battle
 * store's `freshState`), so every wave 2..15 gets a distinct board and the
 * order differs each time the player enters a fight.
 *
 * A layout only ever varies the *middle* of the board. The outer shell
 * (`PLINKO_SHELL_WALLS`: side walls + the V-funnel over the throat) is spread
 * into every layout's `walls` by `mk`, because the receiving-cup catch
 * geometry in `PLINKO_CUPS` is tied to that funnel.
 *
 * All five layouts are traced from Figma: node 118:960 (the original board)
 * and the four player sketches 118:1011 / 118:1066 / 118:1138 / 118:1202,
 * squared up where the sketch was loose. They rotate across the run's waves
 * (see `plinkoLayoutForWave`).
 *
 * Authoring rules (kept by hand -- there is no validator):
 *  - Gates: 2..5 sensor bands. Top row at y 289; extra rows lower; a low
 *    centre gate near y ~514..531. `mult` in {2,3,4,5} -- 5 is the
 *    single-gate ceiling. `bit`/`id` are assigned in `mk`. Interior gate
 *    edges are pushed a few px under the neighbouring divider so the sharp
 *    bands (see `plinko-board`) read as one continuous strip.
 *  - Obstacles: rounded-rect OBBs, angle 0, A45 ("/") or -A45 ("\"). No
 *    acute wedge where two bars meet -- a diagonal either welds flush to a
 *    wall or ends free in open space with >= ~26px clearance (~3 ball
 *    diameters). Dividers end by y ~600 and stay within x 24..366 so they
 *    never pinch the funnel throat (x 167..223). A ball that still gets stuck
 *    is timed out by the solver's watchdog.
 *  - Boost pad: y 340..520, `null` when the layout has none.
 */
import {
  PLINKO_D45,
  PLINKO_SHELL_WALLS,
  type PlinkoGate,
  type PlinkoLayout,
  type PlinkoPad,
  type PlinkoWall,
} from '@/constants/plinko';

const A45 = PLINKO_D45;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Middle obstacle bar. `a` in radians (0, A45 for "/", -A45 for "\"). */
function w(cx: number, cy: number, hx: number, hy: number, a = 0, r = 4): PlinkoWall {
  return { id: '', cx, cy, hx, hy, a, r };
}

/** A gate band: x0..x1 wide, 25pt tall from `y0`. Colour follows the multiplier. */
function g(mult: number, x0: number, x1: number, y0: number): PlinkoGate {
  const color = mult >= 5 ? '#A83572' : mult === 4 ? '#83A835' : '#A58F35';
  const mid = (x0 + x1) / 2;
  return {
    id: '',
    bit: 0,
    mult,
    x0,
    x1,
    y0,
    y1: y0 + 25,
    channelMin: clamp(mid - 34, 20, 356),
    channelMax: clamp(mid + 34, 34, 370),
    color,
  };
}

function mk(id: string, middle: PlinkoWall[], gates: PlinkoGate[], pad: PlinkoPad | null): PlinkoLayout {
  return {
    id,
    walls: [...PLINKO_SHELL_WALLS, ...middle].map((wl, i) => ({ ...wl, id: `${id}-w${i}` })),
    gates: gates.map((gt, i) => ({ ...gt, bit: 2 ** i, id: `${id}-g${i}` })),
    pad,
  };
}

const TOP = 289;

export const PLINKO_LAYOUTS: readonly PlinkoLayout[] = [
  // 0 -- classic (Figma 118:960). The original hand-tuned board, verbatim.
  mk(
    'classic',
    [
      w(148, 304, 4, 40),
      w(97, 452, 4, 64),
      w(278, 373.5, 4, 109.5),
      w(122.12, 366.11, 4, 40, A45),
      w(252.11, 505.11, 4, 40, A45),
    ],
    [g(2, 16, 148, TOP), g(3, 148, 280, TOP), g(4, 278, 374, TOP), g(2, 278, 374, 427)],
    { x0: 20, x1: 93, y0: 486, y1: 511 },
  ),

  // 1 -- twin towers (sketch 118:1011). X2 | X5 | X2 up top; two near-full
  // dividers commit the ball to a lane. Centre = clean X5. Left = X2 + boost
  // pad (chain-multiply). Right = X2 + a second X2. The pad runs right up to
  // the left divider.
  mk(
    'twin-towers',
    [w(151, 400, 4, 134), w(279, 400, 4, 134)],
    [g(2, 12, 155, TOP), g(5, 150, 278, TOP), g(2, 275, 378, TOP), g(2, 275, 378, 427)],
    { x0: 20, x1: 147, y0: 486, y1: 511 },
  ),

  // 2 -- slash floor (sketch 118:1066). X3 | X2 | X4. A short left divider and
  // a long right one (which owns the X4 + X2 lane). A big "\" deflector, welded
  // to the left wall at the top and clearing the X5 band at the bottom,
  // funnels left-side balls down into a low centre X5; a centred splitter under
  // the X5 band shares its output out.
  mk(
    'slash-floor',
    [
      w(148, 336, 4, 72),
      w(279, 426, 4, 162),
      w(84, 441, 4, 90, -A45),
      w(147, 543, 4, 43),
    ],
    [
      g(3, 12, 152, TOP),
      g(2, 144, 283, TOP),
      g(4, 275, 378, TOP),
      g(2, 275, 378, 427),
      g(5, 146, 278, 514),
    ],
    null,
  ),

  // 3 -- safe columns (sketch 118:1138). Every gate is X2. Three committed
  // lanes; the centre one has a boost pad right under the gate, the sides get
  // a second X2. Centre gambles the pad, sides bank a flat x4. Dividers sit on
  // the gate seams so the bands read as one strip.
  mk(
    'safe-columns',
    [w(148, 424, 4, 138), w(262, 424, 4, 138)],
    [
      g(2, 12, 152, TOP),
      g(2, 144, 266, TOP),
      g(2, 258, 378, TOP),
      g(2, 12, 152, 477),
      g(2, 258, 378, 477),
    ],
    { x0: 152, x1: 258, y0: 358, y1: 384 },
  ),

  // 4 -- right gauntlet (sketch 118:1202). X5 | X3 | X4. Left lane is a clean
  // X5 drop. Right lane stacks X4 -> X2 -> a "/" sweep -> low centre X3, a fat
  // multiplier for a long, lossy, crowded path. The low X3 band runs under its
  // splitter so the two connect.
  mk(
    'right-gauntlet',
    [
      w(148, 410, 4, 146),
      w(279, 335, 4, 71),
      w(337, 490, 4, 52, A45),
      w(300, 540, 4, 17),
    ],
    [
      g(5, 12, 152, TOP),
      g(3, 144, 283, TOP),
      g(4, 275, 378, TOP),
      g(2, 275, 378, 382),
      g(3, 150, 300, 531),
    ],
    null,
  ),
];

/** Fisher-Yates permutation of [0..PLINKO_LAYOUTS.length). */
export function shufflePlinkoOrder(): number[] {
  const order = PLINKO_LAYOUTS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  return order;
}

/**
 * The board for a given wave. The shuffled pool is walked in order and wraps
 * around, so with five layouts across waves 2..15 the set cycles ~3 times per
 * run but in a per-run order (wave 2 -> `order[0]`, wave 7 -> `order[0]` again).
 */
export function plinkoLayoutForWave(order: number[], wave: number): PlinkoLayout {
  const n = PLINKO_LAYOUTS.length;
  const slot = ((((wave - 2) % n) + n) % n);
  return PLINKO_LAYOUTS[order[slot]] ?? PLINKO_LAYOUTS[0];
}

/** Seed for `PlinkoWorld.layout` before any wave-specific layout is chosen. */
export const DEFAULT_PLINKO_LAYOUT = PLINKO_LAYOUTS[0];
