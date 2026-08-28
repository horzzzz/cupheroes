import { Image } from 'expo-image';
import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import type { Reward } from '@/constants/economy';
import { isEmptyReward } from '@/game/economy/rewards';

const ICON_COIN = require('@/assets/images/main/icon-coin.webp');
const ICON_GEM = require('@/assets/images/main/icon-gem.webp');
const ICON_EXP = require('@/assets/images/wheel/icon-exp.webp');

const ICON_SIZE = 32;

/**
 * "+N coin / +N gem / +N xp" row -- shared by the victory/defeat overlays
 * and anywhere else a `Reward` needs to be shown. Renders nothing for a
 * field that's absent or zero, and nothing at all for an empty reward.
 */
export function RewardRow({ reward }: { reward: Reward }) {
  if (isEmptyReward(reward)) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
      {!!reward.coins && <RewardPill icon={ICON_COIN} value={reward.coins} />}
      {!!reward.gems && <RewardPill icon={ICON_GEM} value={reward.gems} />}
      {!!reward.xp && <RewardPill icon={ICON_EXP} value={reward.xp} />}
    </View>
  );
}

function RewardPill({ icon, value }: { icon: number; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Image source={icon} style={{ width: ICON_SIZE, height: ICON_SIZE }} contentFit="contain" />
      <GameText style={{ fontFamily: Fonts.titan, fontSize: 22, color: Colors.white }}>
        +{value}
      </GameText>
    </View>
  );
}
