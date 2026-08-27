import { HERO_POS, Timing } from '@/constants/battle';
import { HealthBar } from '@/components/battle/health-bar';
import type { AttackBeat, MoveBeat } from '@/game/battle/combat';
import { useBattleStore } from '@/game/battle/store';
import type { GameClock } from '@/game/clock';

const HERO_BAR_WIDTH = 90;
const ENEMY_BAR_WIDTH = 80;
const BAR_Y = 299;

export function HealthBars({ clock, scale }: { clock: GameClock; scale: number }) {
  const heroHealth = useBattleStore((s) => s.heroHealth);
  const heroMaxHealth = useBattleStore((s) => s.heroMaxHealth);
  const heroArmor = useBattleStore((s) => s.heroArmor);
  const enemies = useBattleStore((s) => s.enemies);
  const round = useBattleStore((s) => s.round);
  const enteredAt = useBattleStore((s) => s.enteredAt);

  const heroHitBeats = round?.beats.filter(
    (beat): beat is AttackBeat => beat.kind === 'attack' && beat.targetId === 'hero',
  );

  return (
    <>
      <HealthBar
        clock={clock}
        standX={HERO_POS.x}
        y={BAR_Y}
        width={HERO_BAR_WIDTH}
        scale={scale}
        health={heroHealth}
        maxHealth={heroMaxHealth}
        variant="hero"
        armor={heroArmor}
        hitBeats={heroHitBeats}
      />
      {enemies.map((enemy) => {
        if (!enemy.alive) return null;
        const moveBeat = round?.beats.find(
          (beat): beat is MoveBeat => beat.kind === 'move' && beat.actorId === enemy.id,
        );
        const hitBeats = round?.beats.filter(
          (beat): beat is AttackBeat => beat.kind === 'attack' && beat.targetId === enemy.id,
        );
        return (
          <HealthBar
            key={enemy.id}
            clock={clock}
            standX={enemy.standX}
            offsetX={5}
            y={BAR_Y}
            width={ENEMY_BAR_WIDTH}
            scale={scale}
            health={enemy.health}
            maxHealth={enemy.spec.maxHealth}
            variant="enemy"
            moveBeat={moveBeat}
            hitBeats={hitBeats}
            revealAt={(enteredAt[enemy.id] ?? 0) + Timing.enemyEnter}
          />
        );
      })}
    </>
  );
}
