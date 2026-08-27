import { Image } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { HERO_OFFSCREEN_X, HERO_POS, Timing, enemySlotPositions } from '@/constants/battle';
import { computeActorLayout, type ActorLayoutParams } from '@/game/battle/actor-layout';
import type { Round } from '@/game/battle/combat';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';
import { poseImages, spriteDesignSize, type ActorKey, type SpriteSet } from '@/game/sprites';

type SingleActorProps = {
  id: string;
  actorKey: ActorKey;
  sprites: SpriteSet;
  clock: GameClock;
  round: Round | null;
  slotX: number;
  slotY: number;
  facing: 1 | -1;
  bobPhase: number;
  visualScale?: number;
  spawnedAt?: number;
  runIn?: { fromX: number; duration: number };
};

/** One hero or enemy: picks its pose from the current round's beats and lets `computeActorLayout` do the rest. */
function SingleActor({
  id,
  actorKey,
  sprites,
  clock,
  round,
  slotX,
  slotY,
  facing,
  bobPhase,
  visualScale = 1,
  spawnedAt,
  runIn,
}: SingleActorProps) {
  const pose = poseImages(sprites, actorKey);
  const idleSize = useMemo(() => (pose.idle ? spriteDesignSize(pose.idle) : { width: 0, height: 0 }), [pose.idle]);
  const attackSize = useMemo(
    () => (pose.attack ? spriteDesignSize(pose.attack) : idleSize),
    [pose.attack, idleSize],
  );

  const attackBeat = round?.beats.find((beat) => beat.attackerId === id);
  const hitBeat = round?.beats.find((beat) => beat.targetId === id);
  const deathBeat = hitBeat?.lethal ? hitBeat : undefined;

  const params: Omit<ActorLayoutParams, 'now'> = {
    slotX,
    slotY,
    facing,
    bobPhase,
    visualScale,
    spawnedAt,
    runIn,
    idleWidth: idleSize.width,
    idleHeight: idleSize.height,
    attackWidth: attackSize.width,
    attackHeight: attackSize.height,
    attackBeat,
    hitBeat,
    deathBeat,
  };

  // Recomputed once per round (whenever this component re-renders with new
  // beats/props), not per frame -- only the derived value below re-runs on
  // every clock tick.
  const layout = useDerivedValue(() => computeActorLayout({ ...params, now: clock.time.value }));

  const x = useDerivedValue(() => layout.value.x);
  const y = useDerivedValue(() => layout.value.y);
  const width = useDerivedValue(() => layout.value.width);
  const height = useDerivedValue(() => layout.value.height);
  const opacity = useDerivedValue(() => layout.value.opacity);
  const image = useDerivedValue(() => {
    const p = layout.value.pose;
    return p === 'attack' ? pose.attack : p === 'run' ? pose.run : pose.idle;
  });

  if (!pose.idle) return null;

  return <Image image={image} x={x} y={y} width={width} height={height} opacity={opacity} />;
}

type BattleActorsProps = {
  clock: GameClock;
  sprites: SpriteSet;
};

/** Renders the hero and every enemy currently in the wave, positioned per the battle screen's slot layout. */
export function BattleActors({ clock, sprites }: BattleActorsProps) {
  const enemies = useBattleStore((s) => s.enemies);
  const round = useBattleStore((s) => s.round);
  const spawnedAt = useBattleStore((s) => s.spawnedAt);

  const slots = enemySlotPositions(enemies.length);

  return (
    <>
      <SingleActor
        id="hero"
        actorKey="hero"
        sprites={sprites}
        clock={clock}
        round={round}
        slotX={HERO_POS.x}
        slotY={HERO_POS.y}
        facing={1}
        bobPhase={0}
        runIn={{ fromX: HERO_OFFSCREEN_X, duration: Timing.heroEnter }}
      />
      {enemies.map((enemy, i) => (
        <SingleActor
          key={enemy.id}
          id={enemy.id}
          actorKey={enemy.spec.spriteKey}
          sprites={sprites}
          clock={clock}
          round={round}
          slotX={slots[i]?.x ?? 0}
          slotY={slots[i]?.y ?? 0}
          facing={-1}
          bobPhase={(i + 1) * 1.3}
          visualScale={enemy.spec.visualScale}
          spawnedAt={spawnedAt[enemy.id]}
        />
      ))}
    </>
  );
}
