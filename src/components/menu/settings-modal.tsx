import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameMenuOverlay } from '@/components/menu/game-menu-overlay';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const CONTINUE_BUTTON = require('@/assets/images/menu/button-continue.webp');

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Settings screen — Figma node 1:2187. */
export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  return (
    <GameMenuOverlay
      visible={visible}
      onClose={onClose}
      title="SETTINGS"
      footer={
        <Pressable onPress={onClose} style={styles.button}>
          <Image source={CONTINUE_BUTTON} style={StyleSheet.absoluteFill} contentFit="fill" />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: { width: 220, height: 85 }
});
