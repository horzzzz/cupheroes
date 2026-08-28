import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameMenuOverlay } from '@/components/menu/game-menu-overlay';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

const HOME_ICON = require('@/assets/images/menu/icon-home.webp');
const RETRY_ICON = require('@/assets/images/menu/icon-retry.webp');
const CONTINUE_ICON = require('@/assets/images/menu/icon-continue-play.webp');

const ICON_SIZE = 60;

type PauseModalProps = {
  visible: boolean;
  onClose: () => void;
  onHome?: () => void;
  onRetry?: () => void;
};

/**
 * In-game pause menu — Figma node 1:2217. Tapping "home" mid-run doesn't
 * pay out anything (rewards are only granted on an actual victory/defeat,
 * see `battle/store.ts`), so it asks for confirmation first instead of
 * leaving silently -- a second RN `Modal` stacked on top would double up
 * the backdrop, so this just swaps the footer in place.
 */
export function PauseModal({ visible, onClose, onHome, onRetry }: PauseModalProps) {
  const [confirmingExit, setConfirmingExit] = useState(false);

  // Reset back to the normal footer every time the modal is (re)opened.
  useEffect(() => {
    if (visible) setConfirmingExit(false);
  }, [visible]);

  return (
    <GameMenuOverlay
      visible={visible}
      onClose={onClose}
      title="PAUSE"
      notice={
        confirmingExit ? (
          <GameText style={styles.notice}>
            Run progress and rewards will be lost
          </GameText>
        ) : undefined
      }
      footer={
        confirmingExit ? (
          <View style={styles.confirmRow}>
            <Pressable onPress={() => setConfirmingExit(false)} style={styles.confirmButton}>
              <GameText style={styles.confirmLabel}>Stay</GameText>
            </Pressable>
            <Pressable onPress={onHome} style={styles.confirmButton}>
              <GameText style={[styles.confirmLabel, styles.confirmLeave]}>Leave</GameText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.row}>
            <Pressable onPress={() => setConfirmingExit(true)}>
              <Image source={HOME_ICON} style={styles.icon} contentFit="contain" />
            </Pressable>
            <Pressable onPress={onRetry}>
              <Image source={RETRY_ICON} style={styles.icon} contentFit="contain" />
            </Pressable>
            <Pressable onPress={onClose}>
              <Image source={CONTINUE_ICON} style={styles.icon} contentFit="contain" />
            </Pressable>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', width: 260 },
  icon: { width: ICON_SIZE, height: ICON_SIZE },
  notice: {
    fontFamily: Fonts.titan,
    fontSize: 16,
    color: '#ff4e4e',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'center', gap: 30 },
  confirmButton: {
    width: 100,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: Colors.darkPanel,
  },
  confirmLabel: {
    fontFamily: Fonts.titan,
    fontSize: 18,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  confirmLeave: { color: '#ff4e4e' },
});
