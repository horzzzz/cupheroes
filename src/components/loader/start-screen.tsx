import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoaderBackground } from '@/components/loader/loader-background';
import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { openPrivacy, openTerms } from '@/constants/links';
import { Colors } from '@/constants/theme';
import { startMusic } from '@/game/audio/engine';
import { useDesignScale } from '@/hooks/use-design-scale';

const LOGO_ASSET = require('@/assets/images/loader/logo.webp');
const HERO_ASSET = require('@/assets/images/loader/hero.webp');
const BUTTON_ASSET = require('@/assets/images/ui/button-pill.webp');

const LOGO_SIZE = 290;
const LOGO_TOP = 80;
const LOGO_LEFT = 50;

const HERO_WIDTH = 183;
const HERO_HEIGHT = 181;
const HERO_TOP = 389;
const HERO_LEFT = 103;

const BUTTON_WIDTH = 258;
const BUTTON_HEIGHT = 95;
const BUTTON_TOP = 589;

const LEGAL_CENTER_Y = 732;
const LEGAL_WIDTH = 347;
const LINKS_CENTER_Y = 786.5;

type StartScreenProps = {
  onStart: () => void;
};

/** Figma node 1:6 — welcome/PLAY screen shown after the loading progress bar. */
export function StartScreen({ onStart }: StartScreenProps) {
  // Loader screens keep the old edge-to-edge mapping (no safe-area insets):
  // their content already sits well clear of the status bar / home indicator.
  const { width, sx, rawSy: sy, rawS: s } = useDesignScale();
  const [pressed, setPressed] = useState(false);

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

      <Image
        source={HERO_ASSET}
        style={{
          position: 'absolute',
          left: HERO_LEFT * sx,
          top: HERO_TOP * sy,
          width: HERO_WIDTH * s,
          height: HERO_HEIGHT * s,
        }}
        contentFit="contain"
      />

      <GamePressable
        onPress={() => {
          // The tap that dismisses this screen is the app's first user
          // gesture -- the one place autoplay is guaranteed to be allowed
          // (notably on web), so the one shared theme starts here and never
          // stops for the rest of the session.
          startMusic();
          onStart();
        }}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          position: 'absolute',
          left: width / 2 - (BUTTON_WIDTH * s) / 2,
          top: BUTTON_TOP * sy,
          width: BUTTON_WIDTH * s,
          height: BUTTON_HEIGHT * s,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        }}>
        <Image source={BUTTON_ASSET} style={StyleSheet.absoluteFill} contentFit="fill" />
        <View style={styles.buttonLabel} pointerEvents="none">
          <GameText style={{ fontFamily: Fonts.titan, fontSize: 36 * s, color: Colors.white }}>
            PLAY
          </GameText>
        </View>
      </GamePressable>

      <GameText
        style={{
          position: 'absolute',
          left: width / 2 - (LEGAL_WIDTH * s) / 2,
          top: LEGAL_CENTER_Y * sy - (2 * 24 * s) / 2,
          width: LEGAL_WIDTH * s,
          textAlign: 'center',
          fontFamily: Fonts.nunito,
          fontSize: 24 * s,
          lineHeight: 28 * s,
          color: Colors.white,
        }}>
        By tapping “PLAY” you confirm that you 18+ and
      </GameText>

      {/* Centred flex row rather than two fixed-x absolute labels: the Figma
          widths were too tight for the rendered Nunito, so "Privacy policy"
          wrapped to a second line on narrower (Android) screens. One line,
          shrink-to-fit as a last resort. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: LINKS_CENTER_Y * sy - (24 * s) / 2,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 36 * s,
        }}>
        {[
          { label: 'Terms of Use', onPress: openTerms },
          { label: 'Privacy policy', onPress: openPrivacy },
        ].map(({ label, onPress }) => (
          <GamePressable key={label} onPress={onPress} hitSlop={12}>
            <GameText
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontFamily: Fonts.nunito,
                fontSize: 24 * s,
                color: Colors.white,
                textDecorationLine: 'underline',
              }}>
              {label}
            </GameText>
          </GamePressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
