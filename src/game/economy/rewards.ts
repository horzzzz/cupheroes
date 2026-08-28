import type { WheelSector } from '@/components/wheel/fortune-wheel';
import type { Reward } from '@/constants/economy';

export type { Reward };

/** Merges two rewards field by field -- undefined fields don't clobber the other side. */
export function addReward(a: Reward, b: Reward): Reward {
  return {
    coins: (a.coins ?? 0) + (b.coins ?? 0) || undefined,
    gems: (a.gems ?? 0) + (b.gems ?? 0) || undefined,
    xp: (a.xp ?? 0) + (b.xp ?? 0) || undefined,
  };
}

export function isEmptyReward(reward: Reward): boolean {
  return !reward.coins && !reward.gems && !reward.xp;
}

/** What a wheel sector actually pays out -- `WheelSector.type` -> the matching Reward field. */
export function sectorReward(sector: WheelSector): Reward {
  switch (sector.type) {
    case 'coin':
      return { coins: sector.value };
    case 'gem':
      return { gems: sector.value };
    case 'exp':
      return { xp: sector.value };
  }
}
