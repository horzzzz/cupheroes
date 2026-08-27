import { HERO_POS, enemySlotPositions } from '@/constants/battle';
import { HealthBar } from '@/components/battle/health-bar';
import { useBattleStore } from '@/game/battle/store';

const HERO_BAR_WIDTH = 90;
const ENEMY_BAR_WIDTH = 80;
const BAR_Y = 299;

export function HealthBars({ scale }: { scale: number }) {
  const heroHealth = useBattleStore((s) => s.heroHealth);
  const heroMaxHealth = useBattleStore((s) => s.heroMaxHealth);
  const heroArmor = useBattleStore((s) => s.heroArmor);
  const enemies = useBattleStore((s) => s.enemies);

  const slots = enemySlotPositions(enemies.length);

  return (
    <>
      <HealthBar
        x={HERO_POS.x}
        y={BAR_Y}
        width={HERO_BAR_WIDTH}
        scale={scale}
        health={heroHealth}
        maxHealth={heroMaxHealth}
        variant="hero"
        armor={heroArmor}
      />
      {enemies.map((enemy, i) =>
        enemy.alive ? (
          <HealthBar
            key={enemy.id}
            x={(slots[i]?.x ?? 0) + 5}
            y={BAR_Y}
            width={ENEMY_BAR_WIDTH}
            scale={scale}
            health={enemy.health}
            maxHealth={enemy.spec.maxHealth}
            variant="enemy"
          />
        ) : null,
      )}
    </>
  );
}
