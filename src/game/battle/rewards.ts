import { VICTORY_BONUS, WAVE_CLEAR_REWARD, type Reward } from '@/constants/economy';
import { addReward } from '@/game/economy/rewards';

/**
 * What a finished run pays out -- battle-specific, so it lives beside the
 * battle store rather than in `game/economy/`. `wavesCompleted` already
 * counts only fully-cleared waves (see `battle/store.ts`), so a defeat mid
 * wave 1 correctly pays nothing.
 */
export function runReward(wavesCompleted: number, victory: boolean): Reward {
  let reward: Reward = {};
  for (let i = 0; i < wavesCompleted; i += 1) reward = addReward(reward, WAVE_CLEAR_REWARD);
  if (victory) reward = addReward(reward, VICTORY_BONUS);
  return reward;
}
