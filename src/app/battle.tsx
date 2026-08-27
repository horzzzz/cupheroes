import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BattleCanvas } from '@/components/battle/battle-canvas';
import { BattleHud } from '@/components/battle/battle-hud';
import { BattleLoader } from '@/components/battle/battle-loader';
import { DamageNumbers } from '@/components/battle/damage-numbers';
import { DefeatOverlay } from '@/components/battle/defeat-overlay';
import { HealthBars } from '@/components/battle/health-bars';
import { VictoryOverlay } from '@/components/battle/victory-overlay';
import { GameText } from '@/components/ui/game-text';
import { PauseModal } from '@/components/menu/pause-modal';
import { BattleFrame } from '@/constants/battle';
import { Colors } from '@/constants/theme';
import { Fonts } from '@/constants/fonts';
import { useBattleScheduler } from '@/game/battle/use-battle-scheduler';
import { useBattleStore } from '@/game/battle/store';
import { useGameClock } from '@/game/clock';
import { useDesignScale } from '@/hooks/use-design-scale';

/** How far the solid-color panel below the canvas rides up over it (Figma node 1:1182: canvas ends at 484, the panel starts at 454). */
const JOURNEY_OVERLAP = 30;

/**
 * The battle screen -- Figma node 1:1182. The scene block (canvas + health
 * bars + HUD, which all share the canvas's own coordinate space and can't
 * be flex children of each other -- Skia doesn't do flexbox) sits at a
 * fixed design width/height; everything below it is a normal flex column,
 * not more absolute offsets from the screen's top.
 *
 * Full-bleed, not `SafeAreaView`-padded: the sky and the green "journey"
 * panel are the screen's actual background, so they must reach under the
 * notch and the home indicator like the loader screen's art does (see the
 * raw/safe split in `useDesignScale`) -- padding the whole scene down from
 * the insets instead would expose the root view's flat color as bars top
 * and bottom. Only the HUD's own top offset needs `insets.top`, to keep its
 * buttons clear of the notch.
 */
export default function BattleScreen() {
  const clock = useGameClock();
  useBattleScheduler(clock);
  const insets = useSafeAreaInsets();
  // `sx` (width-only ratio), not `s` (=min(sx,sy), the "contain" factor the
  // rest of the app uses for sizing content *inside* a full-width column).
  // The scene here IS the container, so it must be pinned to the device's
  // actual width -- `s` would leave black bars on any aspect ratio taller
  // or shorter than the 390x844 mock, exactly what showed up on device.
  const { sx: scale } = useDesignScale();

  const [canvasReady, setCanvasReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);

  const phase = useBattleStore((s) => s.phase);
  const wave = useBattleStore((s) => s.wave);
  const balls = useBattleStore((s) => s.balls);
  const enemies = useBattleStore((s) => s.enemies);
  const wavesCompleted = useBattleStore((s) => s.wavesCompleted);
  const reset = useBattleStore((s) => s.reset);

  // Start every visit to this screen from a clean run.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once, on mount only
  }, []);

  useEffect(() => {
    clock.paused.value = paused || phase === 'victory' || phase === 'defeat';
  }, [paused, phase, clock.paused]);

  useEffect(() => {
    clock.timeScale.value = fast ? 2 : 1;
  }, [fast, clock.timeScale]);

  const waveProgress = enemies.length > 0 ? enemies.filter((e) => !e.alive).length / enemies.length : 0;

  const goHome = () => router.back();

  const handleRetry = () => {
    reset();
    setPaused(false);
  };

  return (
    <View style={styles.root}>
      <View style={{ flex: 1, width: BattleFrame.width * scale, alignSelf: 'center' }}>
        <View style={{ width: BattleFrame.width * scale, height: BattleFrame.canvasHeight * scale }}>
          <BattleCanvas clock={clock} scale={scale} onReady={setCanvasReady} />
          <HealthBars scale={scale} />
          <DamageNumbers clock={clock} scale={scale} />
          <BattleHud
            scale={scale}
            insetTop={insets.top}
            balls={balls}
            wave={wave}
            waveProgress={waveProgress}
            fast={fast}
            onToggleFast={() => setFast((f) => !f)}
            onPause={() => setPaused(true)}
          />
        </View>

        <View
          style={{
            flex: 1,
            marginTop: -JOURNEY_OVERLAP * scale,
            backgroundColor: '#8dbd1b',
            alignItems: 'center',
            paddingTop: 110 * scale,
            paddingBottom: insets.bottom,
          }}
          pointerEvents="none">
          <GameText
            style={{
              fontFamily: Fonts.titan,
              fontSize: 24 * scale,
              color: Colors.white,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}>
            Journey in progress
          </GameText>
        </View>
      </View>

      {!canvasReady && <BattleLoader />}

      {phase === 'victory' && <VictoryOverlay onCollect={goHome} />}
      {phase === 'defeat' && <DefeatOverlay wavesCompleted={wavesCompleted} onContinue={goHome} />}

      <PauseModal visible={paused} onClose={() => setPaused(false)} onHome={goHome} onRetry={handleRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screenBackground },
});
