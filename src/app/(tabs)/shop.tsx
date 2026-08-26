import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

/** Shop screen placeholder — not implemented yet. */
export default function ShopScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <GameText style={{ fontFamily: Fonts.titan, fontSize: 24, color: Colors.white }}>SHOP</GameText>
    </View>
  );
}
