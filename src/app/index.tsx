import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { LoaderBackground } from '@/components/loader/loader-background';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDesignScale } from '@/hooks/use-design-scale';

const LOGO_ASSET = require('@/assets/images/loader/logo.png');
const LOGO_SIZE = 290;

/** Placeholder home screen — the real game screen replaces this next. */
export default function HomeScreen() {
  const { s } = useDesignScale();

  return (
    <View style={styles.container}>
      <LoaderBackground />
      <View style={styles.content}>
        <Image
          source={LOGO_ASSET}
          style={{ width: LOGO_SIZE * s, height: LOGO_SIZE * s }}
          contentFit="contain"
        />
        <GameText
          style={{
            fontFamily: Fonts.titan,
            fontSize: 28 * s,
            color: Colors.white,
            marginTop: 24 * s,
          }}>
          MAIN SCREEN
        </GameText>
        <GameText
          style={{
            fontFamily: Fonts.titan,
            fontSize: 18 * s,
            color: Colors.white,
            marginTop: 8 * s,
          }}>
          COMING SOON
        </GameText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
