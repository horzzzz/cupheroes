import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameMenuOverlay } from '@/components/menu/game-menu-overlay';

const HOME_ICON = require('@/assets/images/menu/icon-home.webp');
const RETRY_ICON = require('@/assets/images/menu/icon-retry.webp');
const CONTINUE_ICON = require('@/assets/images/menu/icon-continue-play.webp');

const ICON_SIZE = 60;

type PauseModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Not wired up yet — no in-game state to return to or restart. */
  onHome?: () => void;
  onRetry?: () => void;
};

/**
 * In-game pause menu — Figma node 1:2217. Built but not wired to any
 * trigger yet — there's no gameplay screen to pause. Hook this up once
 * that exists.
 */
export function PauseModal({ visible, onClose, onHome, onRetry }: PauseModalProps) {
  return (
    <GameMenuOverlay
      visible={visible}
      onClose={onClose}
      title="PAUSE"
      footer={
        <View style={styles.row}>
          <Pressable onPress={onHome}>
            <Image source={HOME_ICON} style={styles.icon} contentFit="contain" />
          </Pressable>
          <Pressable onPress={onRetry}>
            <Image source={RETRY_ICON} style={styles.icon} contentFit="contain" />
          </Pressable>
          <Pressable onPress={onClose}>
            <Image source={CONTINUE_ICON} style={styles.icon} contentFit="contain" />
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', width: 260 },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
});
