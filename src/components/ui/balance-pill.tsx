import { Image } from 'expo-image';
import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { formatCompact } from '@/utils/format-number';

const PILL_WIDTH = 100;
const PILL_HEIGHT = 36;

/** Currency counter used by the top bars — Figma nodes 1:183/1:190. */
export function BalancePill({ icon, value }: { icon: number; value: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: PILL_WIDTH,
        height: PILL_HEIGHT,
        borderRadius: PILL_HEIGHT / 2,
        backgroundColor: Colors.balancePill,
        paddingLeft: 10,
      }}>
      <Image source={icon} style={{ width: 24, height: 24 }} contentFit="contain" />
      <GameText
        style={{ marginLeft: 8, fontFamily: Fonts.nunito, fontSize: 18, color: Colors.white }}>
        {formatCompact(value)}
      </GameText>
    </View>
  );
}
