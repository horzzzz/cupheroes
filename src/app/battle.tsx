import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
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
import { PlinkoScene } from '@/components/plinko/plinko-scene';
import { SkillDraftOverlay } from '@/components/draft/skill-draft-overlay';
import { BattleFrame, halvesInWave } from '@/constants/battle';
import { chapterTheme } from '@/constants/chapters';
import { Colors } from '@/constants/theme';
import { Fonts } from '@/constants/fonts';
import { useBattleScheduler } from '@/game/battle/use-battle-scheduler';
import { displayBalls, useBattleStore, waveProgress } from '@/game/battle/store';
import { useGameClock } from '@/game/clock';
import { usePlinkoInterlude } from '@/game/plinko/use-plinko-interlude';
import { usePlinkoWorld } from '@/game/plinko/world';
import { useDesignScale } from '@/hooks/use-design-scale';

/** How far the solid-color panel below the canvas rides up over it (Figma node 1:1182: canvas ends at 484, the panel starts at 454). */
const JOURNEY_OVERLAP = 30;

/** Deck 1's fill colour behind the pachinko board (Figma node 1:1917's darkest base tone). */
const PLINKO_DECK_BG = '#241009';

/**
 * The battle screen -- Figma node 1:1182 -- plus the between-waves pachinko
 * interlude (node 1:1916). The two live as a vertical two-deck stack: deck 0
 * is the fight, deck 1 the pachinko board directly below it. `usePlinkoInterlude`
 * owns the camera and slides the stack down to deck 1 while the battle store
 * sits in its `plinko` phase, then back up when the board clears.
 *
 * The scene block (canvas + health bars, which share the canvas's own
 * coordinate space and can't be flex children of each other -- Skia doesn't
 * do flexbox) sits at a fixed design width/height; everything below it is a
 * normal flex column.
 *
 * Full-bleed, not `SafeAreaView`-padded: the sky and the green "journey"
 * panel are the screen's actual background and must reach under the notch and
 * home indicator. Only the HUD's own top offset needs `insets.top`.
 */
export default function BattleScreen() {
  const clock = useGameClock();
  useBattleScheduler(clock);
  const insets = useSafeAreaInsets();
  // `sx` (width-only) for the battle scene -- it IS the container, so it pins
  // to device width. `rawS` (contain, edge-to-edge) for the pachinko board --
  // that one can't be cropped (top cup at y=90, receiver at y=814).
  const { sx: scale, s: safeScale, rawS: boardScale, height: deckHeight } = useDesignScale();

  const world = usePlinkoWorld();
  const { cameraY, releaseThrow, awaitingThrow, layout: plinkoLayout } = usePlinkoInterlude(clock, world, deckHeight);
  const deckStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -cameraY.value }] }));

  const [canvasReady, setCanvasReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);

  const phase = useBattleStore((s) => s.phase);
  const wave = useBattleStore((s) => s.wave);
  const chapter = useBattleStore((s) => s.chapter);
  const theme = chapterTheme(chapter);
  const balls = useBattleStore(displayBalls);
  const progress = useBattleStore(waveProgress);
  const wavesCompleted = useBattleStore((s) => s.wavesCompleted);
  const lastReward = useBattleStore((s) => s.lastReward);
  const reset = useBattleStore((s) => s.reset);

  // Start every visit to this screen from a clean run.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once, on mount only
  }, []);

  useEffect(() => {
    // 'plinko' is deliberately absent: the shared clock must keep running so
    // the pachinko sim ticks and the pan timing holds. The pause button still
    // freezes everything through `paused`.
    clock.paused.value = paused || phase === 'victory' || phase === 'defeat';
  }, [paused, phase, clock.paused]);

  useEffect(() => {
    clock.timeScale.value = fast ? 2 : 1;
  }, [fast, clock.timeScale]);

  const goHome = () => router.back();

  const handleRetry = () => {
    reset();
    setPaused(false);
  };

  return (
    <View style={styles.root}>
      <Animated.View
        style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: deckHeight * 2 }, deckStyle]}
        pointerEvents="box-none">
        {/* deck 0 -- the fight */}
        <View style={{ height: deckHeight }}>
          <View style={{ flex: 1, width: BattleFrame.width * scale, alignSelf: 'center' }}>
            <View style={{ width: BattleFrame.width * scale, height: BattleFrame.canvasHeight * scale }}>
              <BattleCanvas clock={clock} scale={scale} chapter={chapter} onReady={setCanvasReady} />
              <HealthBars clock={clock} scale={scale} />
              <DamageNumbers clock={clock} scale={scale} />
            </View>

            <View
              style={{
                flex: 1,
                marginTop: -JOURNEY_OVERLAP * scale,
                backgroundColor: theme.groundColor,
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
        </View>

        {/* deck 1 -- the pachinko board, mounted only for the interlude so its
            Skia canvas isn't compositing behind the fight every frame */}
        <View style={{ height: deckHeight, backgroundColor: PLINKO_DECK_BG, justifyContent: 'center' }}>
          {phase === 'plinko' && (
            <PlinkoScene
              world={world}
              clock={clock}
              boardScale={boardScale}
              layout={plinkoLayout}
              wallColor={theme.wallColor}
              awaitingThrow={awaitingThrow}
              onThrow={releaseThrow}
            />
          )}
        </View>
      </Animated.View>

      {/* HUD floats over both decks -- the pachinko screen has its own (pill +
          x2 + pause, node 1:1941), so in `plinko` phase we just drop the wave bar. */}
      <BattleHud
        scale={scale}
        insetTop={insets.top}
        balls={balls}
        wave={wave}
        waveProgress={progress}
        hasMidCheckpoint={halvesInWave(wave) > 1}
        compact={phase === 'plinko' || phase === 'draft'}
        hideFast={phase === 'draft'}
        fast={fast}
        onToggleFast={() => setFast((f) => !f)}
        onPause={() => setPaused(true)}
      />

      {!canvasReady && <BattleLoader />}

      {phase === 'draft' && <SkillDraftOverlay clock={clock} scale={safeScale} />}

      {phase === 'victory' && (
        <VictoryOverlay reward={lastReward ?? {}} chapter={chapter} onCollect={goHome} />
      )}
      {phase === 'defeat' && (
        <DefeatOverlay wavesCompleted={wavesCompleted} reward={lastReward ?? {}} onContinue={goHome} />
      )}

      <PauseModal visible={paused} onClose={() => setPaused(false)} onHome={goHome} onRetry={handleRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screenBackground },
});
