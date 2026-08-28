import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { LoaderBackground } from '@/components/loader/loader-background';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDailyStore } from '@/game/daily/store';
import { useEconomyStore } from '@/game/economy/store';
import { useDesignScale } from '@/hooks/use-design-scale';

const LOGO_ASSET = require('@/assets/images/loader/logo.webp');
const LOGO_SIZE = 290;
const LOGO_TOP = 80;
const LOGO_LEFT = 50;

const WELCOME_TOP = 455;
const WELCOME_WIDTH = 344;

const LOADING_LABEL_CENTER_Y = 693.5;

const TRACK_TOP = 727;
const TRACK_WIDTH = 328;
const TRACK_HEIGHT = 32;
const TRACK_INSET = 2;

type LoadingScreenProps = {
  onDone: () => void;
};

/** Figma node 1:2316 — progress screen shown right after the native splash. */
export function LoadingScreen({ onDone }: LoadingScreenProps) {
  // Loader screens keep the old edge-to-edge mapping (no safe-area insets):
  // their content already sits well clear of the status bar / home indicator.
  const { width, sx, rawSy: sy, rawS: s } = useDesignScale();
  const progress = useSharedValue(0);

  // `onDone` only fires once BOTH the 2s progress animation has finished AND
  // the persisted economy/daily stores have hydrated -- a spend or grant
  // that lands before hydration finishes gets silently clobbered by the
  // merge that hydration performs when it completes.
  const [animDone, setAnimDone] = useState(false);
  const economyHydrated = useEconomyStore((s) => s.hydrated);
  const dailyHydrated = useDailyStore((s) => s.hydrated);

  useEffect(() => {
    progress.value = withTiming(100, { duration: 2000 }, (finished) => {
      if (finished) runOnJS(setAnimDone)(true);
    });
  }, [progress]);

  useEffect(() => {
    if (animDone && economyHydrated && dailyHydrated) onDone();
  }, [animDone, economyHydrated, dailyHydrated, onDone]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.container}>
      <LoaderBackground />

      <Image
        source={LOGO_ASSET}
        style={{
          position: 'absolute',
          left: LOGO_LEFT * sx,
          top: LOGO_TOP * sy,
          width: LOGO_SIZE * s,
          height: LOGO_SIZE * s,
        }}
        contentFit="contain"
      />

      <View
        style={{
          position: 'absolute',
          left: width / 2 - (WELCOME_WIDTH * s) / 2,
          top: WELCOME_TOP * sy,
          width: WELCOME_WIDTH * s,
          alignItems: 'center',
          gap: 12 * s,
        }}>
        <GameText
          gradient
          style={{ fontFamily: Fonts.titan, fontSize: 36 * s, letterSpacing: -0.77 }}>
          WELCOME!
        </GameText>
        <GameText
          gradient
          style={{
            fontFamily: Fonts.titan,
            fontSize: 24 * s,
            textAlign: 'center',
          }}>
          LET&apos;S GET STARTED!
        </GameText>
      </View>

      <GameText
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: LOADING_LABEL_CENTER_Y * sy - (36 * s) / 2,
          textAlign: 'center',
          fontFamily: Fonts.titan,
          fontSize: 36 * s,
          color: Colors.white,
        }}>
        loading...
      </GameText>

      <View
        style={{
          position: 'absolute',
          left: width / 2 - (TRACK_WIDTH * s) / 2,
          top: TRACK_TOP * sy,
          width: TRACK_WIDTH * s,
          height: TRACK_HEIGHT * s,
          borderRadius: 53 * s,
          backgroundColor: Colors.trackBackground,
          padding: TRACK_INSET * s,
        }}>
        <Animated.View
          style={[
            {
              height: (TRACK_HEIGHT - TRACK_INSET * 2) * s,
              minWidth: (TRACK_HEIGHT - TRACK_INSET * 2) * s,
              borderRadius: 39 * s,
              overflow: 'hidden',
            },
            fillStyle,
          ]}>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.trackHighlight} pointerEvents="none" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  trackHighlight: {
    ...StyleSheet.absoluteFill,
    borderRadius: 39,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth * 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
