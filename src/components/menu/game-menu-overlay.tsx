import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuBackground } from '@/components/menu/menu-background';
import { VolumeSlider } from '@/components/menu/volume-slider';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors, MainScreen } from '@/constants/theme';

const CLOSE_ICON = require('@/assets/images/menu/icon-close.webp');

type GameMenuOverlayProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  footer: ReactNode;
};

function SettingRow({ label, initialValue }: { label: string; initialValue: number }) {
  // Music/sound have no real audio system behind them yet — the slider just
  // holds its own local value as a stand-in.
  const [value, setValue] = useState(initialValue);
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <GameText style={styles.rowLabel}>{label}</GameText>
        <GameText style={styles.rowLabel}>{Math.round(value * 100)}%</GameText>
      </View>
      <VolumeSlider value={value} onChange={setValue} />
    </View>
  );
}

/**
 * Full-screen menu shared by Settings and Pause — Figma nodes 1:2187 / 1:2217.
 * The two screens are identical apart from the title and the footer (a
 * continue button vs. home/retry/continue icons), so callers pass the
 * footer in and this owns everything else.
 */
export function GameMenuOverlay({ visible, onClose, title, footer }: GameMenuOverlayProps) {
  // Absolutely-positioned children ignore a SafeAreaView's own inset
  // padding (they align to its outer edge, not the padded content edge),
  // so the close button needs the top inset added in by hand or it sits
  // under the status bar/notch.
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <MenuBackground />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[styles.closeButton, { top: insets.top }]}>
            <Image source={CLOSE_ICON} style={styles.closeIcon} contentFit="contain" />
          </Pressable>

          <View style={styles.column}>
            <GameText style={styles.title}>{title}</GameText>

            <View style={styles.content}>
              <SettingRow label="MUSIC" initialValue={1} />
              <SettingRow label="SOUND" initialValue={1} />

              <View style={styles.links}>
                <GameText gradient style={styles.link}>
                  PRIVACY POLICY
                </GameText>
                <GameText gradient style={styles.link}>
                  TERMS OF USE
                </GameText>
              </View>
            </View>

            <View style={styles.footer}>{footer}</View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screenBackground },
  closeButton: { position: 'absolute', right: 20, zIndex: 10 },
  closeIcon: { width: 36, height: 36 },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MainScreen.frameWidth,
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingTop: 50,
    paddingBottom: 40,
  },
  title: {
    fontFamily: Fonts.titan,
    fontSize: 24,
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  content: { flex: 1 },
  row: { marginBottom: 30 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: {
    fontFamily: Fonts.titan,
    fontSize: 24,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  links: { alignItems: 'center', marginTop: 20, gap: 20 },
  link: {
    fontFamily: Fonts.titan,
    fontSize: 18,
    textTransform: 'uppercase',
    textDecorationLine: 'underline',
  },
  footer: { alignItems: 'center' },
});
