import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { GameMenuOverlay } from '@/components/menu/game-menu-overlay';
import { GamePressable } from '@/components/ui/game-pressable';
import { reportEvent } from '@/services/analytics';

const CONTINUE_BUTTON = require('@/assets/images/menu/button-continue.webp');

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Settings screen — Figma node 1:2187. */
export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  useEffect(() => {
    if (visible) reportEvent('settings', { action: 'open' });
  }, [visible]);

  return (
    <GameMenuOverlay
      visible={visible}
      onClose={onClose}
      title="SETTINGS"
      footer={
        <GamePressable onPress={onClose} style={styles.button}>
          <Image source={CONTINUE_BUTTON} style={StyleSheet.absoluteFill} contentFit="fill" />
        </GamePressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: { width: 220, height: 85 }
});
