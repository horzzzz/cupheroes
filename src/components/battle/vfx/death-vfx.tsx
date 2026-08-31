import {
  Atlas,
  Circle,
  Group,
  Path,
  RoundedRect,
  Skia,
  useColorBuffer,
  useRSXformBuffer,
  type SkRect,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { ENEMY_SLOT_Y, Timing } from '@/constants/battle';
import { DeathVfx } from '@/constants/vfx';
import { impactAt } from '@/game/battle/combat';
import { useBattleStore } from '@/game/battle/store';
import { usePuffTexture } from '@/game/battle/vfx-textures';
import type { GameClock } from '@/game/clock';
import { clamp01, easeOutCubic } from '@/game/easing';

/**
 * Every death this run gets a puff of smoke and a skull that flies out of
 * it -- hero included (see `battle-actors.tsx`'s `heroDiedAt`, which lands
 * hero deaths as an ordinary lethal `AttackBeat` same as any enemy's, so
 * this component needs no hero-specific branch). Assignment is a one-shot
 * JS write per round (`round.beats` filtered for `lethal`), same pattern as
 * `ball-drop.tsx`; the smoke puffs draw as one `<Atlas>` pool, the skull
 * (a handful of tiny shapes, not Atlas-friendly) as up to `skullSlots`
 * plain Skia groups, each a pure function of the game clock.
 */

const ORIGIN_Y = ENEMY_SLOT_Y + 45;
const SMOKE_POOL = DeathVfx.smokeParticlesPerDeath * DeathVfx.smokeDeaths;

type SmokeSlot = { startAt: number; x: number; y: number; angle: number; dist: number };
type SkullSlot = { startAt: number; x: number; y: number; driftX: number; spin: number };

function idleSmoke(): SmokeSlot {
  return { startAt: -Infinity, x: 0, y: 0, angle: 0, dist: 0 };
}
function idleSkull(): SkullSlot {
  return { startAt: -Infinity, x: 0, y: 0, driftX: 0, spin: 1 };
}

type DeathVfxProps = {
  clock: GameClock;
  /** Device scale the puff texture renders at (see `usePuffTexture`) -- the same value the canvas's
   * own `<Group transform={[{ scale }]}>` applies to every design-point layer. */
  scale: number;
};

export function DeathVfxLayer({ clock, scale }: DeathVfxProps) {
  const round = useBattleStore((s) => s.round);
  const puffTexture = usePuffTexture(DeathVfx.smokeStartRadius * DeathVfx.smokeGrowth * 2, scale);

  const smokeSlots = useSharedValue<SmokeSlot[]>(Array.from({ length: SMOKE_POOL }, idleSmoke));
  const skullSlots = useSharedValue<SkullSlot[]>(Array.from({ length: DeathVfx.skullSlots }, idleSkull));
  const smokeCursor = useRef(0);
  const skullCursor = useRef(0);

  useEffect(() => {
    if (!round) return;
    const lethalHits = round.beats.filter((beat) => beat.kind === 'attack' && beat.lethal);
    if (lethalHits.length === 0) return;

    const nextSmoke = smokeSlots.value.slice();
    const nextSkulls = skullSlots.value.slice();

    for (const beat of lethalHits) {
      if (beat.kind !== 'attack') continue;
      const startAt = impactAt(beat);
      const x = beat.targetX + 45;

      for (let i = 0; i < DeathVfx.smokeParticlesPerDeath; i += 1) {
        const slotIndex = smokeCursor.current % SMOKE_POOL;
        smokeCursor.current += 1;
        nextSmoke[slotIndex] = {
          startAt,
          x,
          y: ORIGIN_Y,
          angle: (i / DeathVfx.smokeParticlesPerDeath) * Math.PI * 2 + Math.random() * 0.8,
          dist: 0.6 + Math.random() * 0.4,
        };
      }

      const skullIndex = skullCursor.current % DeathVfx.skullSlots;
      skullCursor.current += 1;
      nextSkulls[skullIndex] = {
        startAt: startAt + DeathVfx.skullDelay,
        x,
        y: ORIGIN_Y,
        driftX: (Math.random() - 0.5) * 2 * DeathVfx.skullDrift,
        spin: Math.random() < 0.5 ? -1 : 1,
      };
    }

    smokeSlots.value = nextSmoke;
    skullSlots.value = nextSkulls;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per new round object
  }, [round]);

  const spriteRects = useMemo<SkRect[]>(() => {
    const w = puffTexture?.width() ?? 0;
    const h = puffTexture?.height() ?? 0;
    return Array.from({ length: SMOKE_POOL }, () => Skia.XYWHRect(0, 0, w, h));
  }, [puffTexture]);

  const nativeWidth = puffTexture ? puffTexture.width() : 0;

  // Per-particle alpha (the puff's fade-in/fade-out), fed to the Atlas as
  // white-with-varying-alpha and composited with `dstIn` so it scales the
  // texture's own alpha without recolouring it. `useColorBuffer` (not a
  // plain memoized array) so its worklet mutations are actually picked up --
  // same mechanism `smokeTransforms` below relies on for `useRSXformBuffer`.
  const smokeColors = useColorBuffer(SMOKE_POOL, (val, i) => {
    'worklet';
    const slot = smokeSlots.value[i];
    const now = clock.time.value;
    const elapsed = now - slot.startAt;
    const visible = now >= slot.startAt && elapsed < Timing.deathSmoke;
    const t = clamp01(elapsed / Timing.deathSmoke);
    val[0] = 1;
    val[1] = 1;
    val[2] = 1;
    val[3] = visible ? Math.sin(t * Math.PI) * DeathVfx.smokeMaxOpacity : 0;
  });

  const smokeTransforms = useRSXformBuffer(SMOKE_POOL, (val, i) => {
    'worklet';
    const slot = smokeSlots.value[i];
    const now = clock.time.value;
    const elapsed = now - slot.startAt;
    const t = clamp01(elapsed / Timing.deathSmoke);
    if (nativeWidth === 0 || now < slot.startAt || elapsed >= Timing.deathSmoke) {
      val.set(1, 0, -4000, -4000);
      return;
    }
    const grow = 1 + t * (DeathVfx.smokeGrowth - 1);
    const size = DeathVfx.smokeStartRadius * 2 * grow;
    const spreadDist = DeathVfx.smokeSpread * slot.dist * easeOutCubic(t);
    const x = slot.x + Math.cos(slot.angle) * spreadDist;
    const y = slot.y - DeathVfx.smokeRise * easeOutCubic(t) + Math.sin(slot.angle) * spreadDist * 0.4;
    const s = size / nativeWidth;
    const half = (nativeWidth * s) / 2;
    val.set(s, 0, x - half, y - half);
  });

  return (
    <>
      {puffTexture && (
        <Atlas
          image={puffTexture}
          sprites={spriteRects}
          transforms={smokeTransforms}
          colors={smokeColors}
          colorBlendMode="dstIn"
        />
      )}
      {Array.from({ length: DeathVfx.skullSlots }, (_, i) => (
        <SkullParticle key={i} index={i} slots={skullSlots} clock={clock} />
      ))}
    </>
  );
}

/** Skull path (a bare nose triangle, `SkPath` string data) is fixed, so it's built once as a shared
 * constant rather than per-instance -- the cranium/jaw/eyes below are simple shape primitives instead. */
const NOSE_PATH = 'M0,-0.5 L-1.4,1.6 L1.4,1.6 Z';

function SkullParticle({
  index,
  slots,
  clock,
}: {
  index: number;
  slots: SharedValue<SkullSlot[]>;
  clock: GameClock;
}) {
  const transform = useDerivedValue(() => {
    const slot = slots.value[index];
    const now = clock.time.value;
    const elapsed = now - slot.startAt;
    if (now < slot.startAt || elapsed >= Timing.deathSkull) {
      return [{ translateX: -4000 }, { translateY: -4000 }, { scale: 1 }, { rotate: 0 }];
    }
    const t = clamp01(elapsed / Timing.deathSkull);
    const x = slot.x + slot.driftX * t;
    const y = slot.y - DeathVfx.skullRise * easeOutCubic(t);
    const rotate = (slot.spin * (DeathVfx.skullSpinDeg * Math.PI)) / 180 * t;
    return [{ translateX: x }, { translateY: y }, { scale: DeathVfx.skullSize / 14 }, { rotate }];
  });

  const opacity = useDerivedValue(() => {
    const slot = slots.value[index];
    const now = clock.time.value;
    const elapsed = now - slot.startAt;
    if (now < slot.startAt || elapsed >= Timing.deathSkull) return 0;
    const t = clamp01(elapsed / Timing.deathSkull);
    const fadeIn = clamp01(t / 0.15);
    const fadeOut = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    return Math.min(fadeIn, fadeOut);
  });

  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={-2} r={7} color="#EDE7D8" />
      <RoundedRect x={-4} y={2} width={8} height={5} r={2} color="#EDE7D8" />
      <Circle cx={-2.5} cy={-2} r={1.6} color="#2B2118" />
      <Circle cx={2.5} cy={-2} r={1.6} color="#2B2118" />
      <Path path={NOSE_PATH} color="#2B2118" />
    </Group>
  );
}
