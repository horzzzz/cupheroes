import { Image } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { ENEMY_ENTER_X, ENEMY_SLOT_Y, HERO_OFFSCREEN_X, HERO_POS, Timing } from '@/constants/battle';
import { computeActorLayout, type ActorLayoutParams } from '@/game/battle/actor-layout';
import type { AttackBeat, MoveBeat, Round } from '@/game/battle/combat';
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
  walking?: boolean;
  runIn?: { fromX: number; startAt: number; duration: number };
  /** Game-clock time this actor died, if it's dead -- see `computeActorLayout`'s `deadAt`. */
  deadAt?: number;
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
  walking,
  runIn,
  deadAt,
}: SingleActorProps) {
  const pose = poseImages(sprites, actorKey);
  const idleSize = useMemo(() => (pose.idle ? spriteDesignSize(pose.idle) : { width: 0, height: 0 }), [pose.idle]);
  const attackSize = useMemo(
    () => (pose.attack ? spriteDesignSize(pose.attack) : idleSize),
    [pose.attack, idleSize],
  );

  const attackBeats = round?.beats.filter(
    (beat): beat is AttackBeat => beat.kind === 'attack' && beat.attackerId === id,
  );
  const hitBeats = round?.beats.filter(
    (beat): beat is AttackBeat => beat.kind === 'attack' && beat.targetId === id,
  );
  const moveBeat = round?.beats.find((beat): beat is MoveBeat => beat.kind === 'move' && beat.actorId === id);

  const params: Omit<ActorLayoutParams, 'now'> = {
    slotX,
    slotY,
    facing,
    bobPhase,
    visualScale,
    walking,
    runIn,
    idleWidth: idleSize.width,
    idleHeight: idleSize.height,
    attackWidth: attackSize.width,
    attackHeight: attackSize.height,
    attackBeats,
    hitBeats,
    moveBeat,
    deadAt,
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

/** Renders the hero and every enemy of the current pack, positioned per the battle screen's slot layout. */
export function BattleActors({ clock, sprites }: BattleActorsProps) {
  const phase = useBattleStore((s) => s.phase);
  const enemies = useBattleStore((s) => s.enemies);
  const round = useBattleStore((s) => s.round);
  const enteredAt = useBattleStore((s) => s.enteredAt);
  const heroDiedAt = useBattleStore((s) => s.heroDiedAt);

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
        walking={phase === 'advancing'}
        runIn={{ fromX: HERO_OFFSCREEN_X, startAt: 0, duration: Timing.heroEnter }}
        deadAt={heroDiedAt}
      />
      {enemies.map((enemy, i) => (
        <SingleActor
          key={enemy.id}
          id={enemy.id}
          actorKey={enemy.spec.range}
          sprites={sprites}
          clock={clock}
          round={round}
          slotX={enemy.standX}
          slotY={ENEMY_SLOT_Y}
          facing={-1}
          bobPhase={(i + 1) * 1.3}
          visualScale={enemy.spec.visualScale}
          runIn={{ fromX: ENEMY_ENTER_X, startAt: enteredAt[enemy.id] ?? 0, duration: Timing.enemyEnter }}
          deadAt={enemy.diedAt}
        />
      ))}
    </>
  );
}
