import { Circle, Group, Path } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { ENEMY_SLOT_Y } from '@/constants/battle';
import { ProjectileVfx } from '@/constants/vfx';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { clamp01, lerp } from '@/game/easing';

/**
 * Ranged attacks fly as projectiles instead of landing instantly -- the
 * hero's own shots (always ranged -- see `combat.ts`'s `heroVolley`) and a
 * ranged enemy's hit, coloured per the run's chapter. A melee enemy's swing
 * has no `travel` (`AttackBeat.travel` is 0/undefined) and never spawns one.
 * `AttackBeat.startAt` is the launch, `impactAt(beat)` (`startAt + travel`)
 * the arrival -- every other layer (hit-flash, health, death, damage
 * numbers) already keys off `impactAt`; this is the one layer that actually
 * draws the gap between the two.
 *
 * Only a handful fly at once, so unlike the Atlas-pooled layers this renders
 * each pool slot as its own tiny Skia group -- cheap at this pool size, and
 * simpler than fighting one shared draw call into drawing two different
 * shapes (a hero arrow vs. an enemy bolt-and-trail).
 */

const CHEST_Y = ENEMY_SLOT_Y + 40;
const POOL_SIZE = ProjectileVfx.poolSize;

type ProjectileSlot = { startAt: number; travel: number; fromX: number; fromY: number; toX: number; toY: number };
type ProjectileKind = 'hero' | 'enemy';

function idleSlot(): ProjectileSlot {
  return { startAt: -Infinity, travel: 0.001, fromX: 0, fromY: 0, toX: 0, toY: 0 };
}

/** Arrow silhouette (shaft + head + fletching), pointing along +x -- rotated per-instance to aim at its target. */
const ARROW_PATH = 'M11,0 L3,-2.4 L-6,-1 L-11,-3 L-7,0 L-11,3 L-6,1 L3,2.4 Z';

type ProjectilesProps = {
  clock: GameClock;
  /** Ranged-enemy bolt colour for this run's chapter (`ChapterTheme.projectileColor`). */
  enemyColor: string;
};

export function Projectiles({ clock, enemyColor }: ProjectilesProps) {
  const round = useBattleStore((s) => s.round);

  const slots = useSharedValue<ProjectileSlot[]>(Array.from({ length: POOL_SIZE }, idleSlot));
  const [kinds, setKinds] = useState<ProjectileKind[]>(() => Array(POOL_SIZE).fill('enemy'));
  const cursor = useRef(0);

  useEffect(() => {
    if (!round) return;
    const shots = round.beats.filter((beat) => beat.kind === 'attack' && (beat.travel ?? 0) > 0);
    if (shots.length === 0) return;

    const nextSlots = slots.value.slice();
    const nextKinds = [...kinds];

    for (const beat of shots) {
      if (beat.kind !== 'attack') continue;
      const slotIndex = cursor.current % POOL_SIZE;
      cursor.current += 1;
      nextSlots[slotIndex] = {
        startAt: beat.startAt,
        // Always set -- `shots` above already filtered to beats with `travel > 0`.
        travel: beat.travel ?? 0.001,
        fromX: beat.attackerX ?? beat.targetX,
        fromY: CHEST_Y,
        toX: beat.targetX,
        toY: CHEST_Y,
      };
      nextKinds[slotIndex] = beat.attackerId === 'hero' ? 'hero' : 'enemy';
    }

    slots.value = nextSlots;
    setKinds(nextKinds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per new round object
  }, [round]);

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <ProjectileParticle key={i} index={i} slots={slots} kind={kinds[i]} enemyColor={enemyColor} clock={clock} />
      ))}
    </>
  );
}

function ProjectileParticle({
  index,
  slots,
  kind,
  enemyColor,
  clock,
}: {
  index: number;
  slots: SharedValue<ProjectileSlot[]>;
  kind: ProjectileKind;
  enemyColor: string;
  clock: GameClock;
}) {
  const progress = useDerivedValue(() => {
    const slot = slots.value[index];
    const now = clock.time.value;
    const t = clamp01((now - slot.startAt) / slot.travel);
    const visible = now >= slot.startAt && now < slot.startAt + slot.travel;
    return { t, visible };
  });

  const transform = useDerivedValue(() => {
    const slot = slots.value[index];
    const { t, visible } = progress.value;
    if (!visible) return [{ translateX: -4000 }, { translateY: -4000 }, { rotate: 0 }];
    const arc = Math.sin(t * Math.PI) * ProjectileVfx.arcHeight;
    const x = lerp(slot.fromX, slot.toX, t);
    const y = lerp(slot.fromY, slot.toY, t) - arc;
    const angle = Math.atan2(slot.toY - slot.fromY, slot.toX - slot.fromX);
    return [{ translateX: x }, { translateY: y }, { rotate: angle }];
  });

  const opacity = useDerivedValue(() => (progress.value.visible ? 1 : 0));

  if (kind === 'hero') {
    return (
      <Group transform={transform} opacity={opacity}>
        <Path path={ARROW_PATH} color={ProjectileVfx.heroArrowColor} />
        <Path path={ARROW_PATH} style="stroke" strokeWidth={0.6} color={ProjectileVfx.heroArrowEdgeColor} />
      </Group>
    );
  }

  return (
    <Group transform={transform} opacity={opacity}>
      <EnemyTrail progress={progress} color={enemyColor} />
      <Circle cx={0} cy={0} r={ProjectileVfx.enemyBoltRadius} color={enemyColor} />
    </Group>
  );
}

/** A few fading, shrinking circles behind an enemy bolt's head, along the same straight travel line it
 * just came from -- reads as a short trail without needing its own pooled slots. */
function EnemyTrail({
  progress,
  color,
}: {
  progress: SharedValue<{ t: number; visible: boolean }>;
  color: string;
}) {
  return (
    <>
      {Array.from({ length: ProjectileVfx.enemyTrailSteps }, (_, i) => (
        <TrailDot key={i} step={i + 1} progress={progress} color={color} />
      ))}
    </>
  );
}

function TrailDot({
  step,
  progress,
  color,
}: {
  step: number;
  progress: SharedValue<{ t: number; visible: boolean }>;
  color: string;
}) {
  // Trails behind the head along -x in the bolt's own rotated local space
  // (the parent `<Group>` already carries position + heading), fading and
  // shrinking with distance from the head.
  const dx = useDerivedValue(() => -step * (ProjectileVfx.enemyBoltRadius * 1.4));
  const opacity = useDerivedValue(() => (progress.value.visible ? Math.max(0, 0.5 - step * 0.15) : 0));
  const r = ProjectileVfx.enemyBoltRadius * (1 - step * 0.22);

  return <Circle cx={dx} cy={0} r={r} color={color} opacity={opacity} />;
}
