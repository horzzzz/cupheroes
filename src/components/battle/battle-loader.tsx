import { StyleSheet, View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

/**
 * Covers the screen from the moment `FIGHT` is tapped until the battle's
 * sprites and background are decoded and `BattleCanvas` reports ready --
 * there's nothing to animate here, it's the wait before the first frame
 * exists at all.
 */
export function BattleLoader() {
  return (
    <View style={styles.container}>
      <GameText gradient style={{ fontFamily: Fonts.titan, fontSize: 32 }}>
        loading...
      </GameText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
