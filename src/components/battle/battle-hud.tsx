import { Image } from 'expo-image';
import { View } from 'react-native';

import { BalancePill } from '@/components/ui/balance-pill';
import { GamePressable } from '@/components/ui/game-pressable';
import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { WAVE_COUNT } from '@/constants/battle';
import { WaveProgress } from '@/components/battle/wave-progress';

const BALL_ICON = require('@/assets/images/battle/icon-ball.webp');
const PAUSE_ICON = require('@/assets/images/battle/icon-pause.webp');
const X2_ICON = require('@/assets/images/battle/icon-x2.webp');

const ICON_SIZE = 36;
const TOP = 30;
const ROW_TO_WAVE_GAP = 30;
/** Gap from the wave title's baseline to the progress bar -- tuned so the bar's top lands on the Figma frame's y=138. */
const TITLE_TO_PROGRESS_GAP = 15;

/**
 * Overlaid on top of the battle canvas -- Figma node 1:1182. One absolute
 * anchor for the whole block (it floats over the canvas, same as the health
 * bars); everything inside is a normal flex row/column, same as
 * `ScreenTopBar`/`BalancePill` elsewhere in the app -- an element's position
 * comes from its place in the row, not a copied X/Y from the design.
 */
export function BattleHud({
  scale,
  insetTop,
  balls,
  wave,
  waveProgress,
  hasMidCheckpoint,
  compact = false,
  hideFast = false,
  fast,
  onToggleFast,
  onPause,
}: {
  scale: number;
  /** Real device points to clear the notch/status bar -- the scene itself
   * draws full-bleed under it (see `battle.tsx`), so only this overlay's own
   * top offset needs the safe-area inset, unscaled. */
  insetTop: number;
  balls: number;
  wave: number;
  /** 0..1 fraction of the current wave cleared -- see `waveProgress` in the battle store. */
  waveProgress: number;
  /** False on the boss wave -- a single pack has no midpoint to mark. */
  hasMidCheckpoint: boolean;
  /** Pachinko interlude: drop the wave title + progress bar, keep only the top row. */
  compact?: boolean;
  /** Skill draft: hide the x2 toggle too -- there's nothing to speed up while picking a card. */
  hideFast?: boolean;
  fast: boolean;
  onToggleFast: () => void;
  onPause: () => void;
}) {
  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, top: insetTop + TOP * scale }}
      pointerEvents="box-none">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 15 * scale,
        }}
        pointerEvents="box-none">
        <BalancePill icon={BALL_ICON} value={balls} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale }}>
          {!hideFast && (
            <GamePressable onPress={onToggleFast} style={{ opacity: fast ? 1 : 0.6 }} hitSlop={8}>
              <Image
                source={X2_ICON}
                style={{ width: ICON_SIZE * scale, height: ICON_SIZE * scale }}
                contentFit="contain"
              />
            </GamePressable>
          )}
          <GamePressable onPress={onPause} hitSlop={8}>
            <Image
              source={PAUSE_ICON}
              style={{ width: ICON_SIZE * scale, height: ICON_SIZE * scale }}
              contentFit="contain"
            />
          </GamePressable>
        </View>
      </View>

      {!compact && (
        <View
          style={{ alignItems: 'center', marginTop: ROW_TO_WAVE_GAP * scale, gap: TITLE_TO_PROGRESS_GAP * scale }}
          pointerEvents="none">
          <GameText
            style={{
              textTransform: 'uppercase',
              fontFamily: Fonts.titan,
              fontSize: 24 * scale,
              color: Colors.white,
            }}>
            {`Wave ${Math.min(wave, WAVE_COUNT)}/${WAVE_COUNT}`}
          </GameText>

          <WaveProgress scale={scale} progress={waveProgress} hasMidCheckpoint={hasMidCheckpoint} />
        </View>
      )}
    </View>
  );
}
