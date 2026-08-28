import { Canvas, Group, Image, Rect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing as ReaEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  PLINKO_AIM_RANGE,
  PLINKO_CUPS,
  PLINKO_TUNING,
  PlinkoFrame,
  type PlinkoLayout,
} from '@/constants/plinko';
import { Fonts } from '@/constants/fonts';
import type { GameClock } from '@/game/clock';
import { PlinkoBalls } from '@/components/plinko/plinko-balls';
import { PlinkoBoard } from '@/components/plinko/plinko-board';
import { PlinkoCups } from '@/components/plinko/plinko-cups';
import { usePlinkoBallTexture, usePlinkoSprites } from '@/game/plinko/sprites';
import { usePlinkoStore } from '@/game/plinko/store';
import type { PlinkoWorld } from '@/game/plinko/world';

/**
 * The interactive pachinko board -- Figma node 1:1916. The Skia canvas
 * (background image, board, balls, cups) plus a full-cover pan gesture that
 * writes the aim x straight to the UI thread, plus the multiplier labels and
 * the two cup counters as plain RN text (the app's convention: Skia draws the
 * scene, RN/Reanimated draws numbers).
 *
 * Everything Skia-side draws in fixed 390x844 design points inside one
 * `<Group transform={[{ scale }]}>` -- the single place device scale is
 * applied, same convention as `battle-canvas.tsx`.
 */
type PlinkoSceneProps = {
  world: PlinkoWorld;
  clock: GameClock;
  boardScale: number;
  /** The board being played this wave -- walls, gates and optional boost pad. */
  layout: PlinkoLayout;
  /** True until the player has started the pour -- shows the "tap to pour" hint. */
  awaitingThrow: boolean;
  /** Starts the drop. Called on the first touch on the board. */
  onThrow: () => void;
};

const clampAim = (x: number) => {
  'worklet';
  return x < PLINKO_AIM_RANGE.min ? PLINKO_AIM_RANGE.min : x > PLINKO_AIM_RANGE.max ? PLINKO_AIM_RANGE.max : x;
};

export function PlinkoScene({ world, clock, boardScale, layout, awaitingThrow, onThrow }: PlinkoSceneProps) {
  const width = PlinkoFrame.width * boardScale;
  const height = PlinkoFrame.height * boardScale;
  const texture = usePlinkoBallTexture(PLINKO_TUNING.radius, boardScale);
  const sprites = usePlinkoSprites();

  const remaining = usePlinkoStore((s) => s.remaining);
  const collected = usePlinkoStore((s) => s.collected);

  // Press-drag-release: steer the cup while the finger is down, pour on
  // release. Once released, `aimLocked` freezes the cup for the rest of this
  // drop (unlocked again by the next wave's interlude).
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      if (world.aimLocked.value === 0) world.aimX.value = clampAim(e.x / boardScale);
    })
    .onChange((e) => {
      'worklet';
      if (world.aimLocked.value === 0) world.aimX.value = clampAim(e.x / boardScale);
    })
    .onEnd(() => {
      'worklet';
      if (world.aimLocked.value === 0) {
        world.aimLocked.value = 1;
        runOnJS(onThrow)();
      }
    })
    .onFinalize(() => {
      'worklet';
      if (world.aimLocked.value === 0) {
        world.aimLocked.value = 1;
        runOnJS(onThrow)();
      }
    });

  // Top cup counter rides with the aim; bottom one is fixed over the throat.
  const topNumStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: world.aimX.value * boardScale }],
  }));

  // Gentle pulse on the "tap to pour" hint.
  const hintPulse = useSharedValue(0.55);
  useEffect(() => {
    hintPulse.value = withRepeat(withTiming(1, { duration: 700, easing: ReaEasing.inOut(ReaEasing.quad) }), -1, true);
  }, [hintPulse]);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintPulse.value }));

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <GestureDetector gesture={pan}>
        <View style={{ width, height }} collapsable={false}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={[{ scale: boardScale }]}>
              <Rect x={0} y={0} width={PlinkoFrame.width} height={PlinkoFrame.height} color="#241009" />
              {sprites.board && (
                <Image
                  image={sprites.board}
                  x={0}
                  y={0}
                  width={PlinkoFrame.width}
                  height={PlinkoFrame.height}
                  fit="fill"
                />
              )}

              <PlinkoBoard world={world} pad={sprites.pad} layout={layout} />
              {texture && <PlinkoBalls world={world} clock={clock} texture={texture} />}
              <PlinkoCups world={world} cup={sprites.cup} />
            </Group>
          </Canvas>
        </View>
      </GestureDetector>

      {layout.gates.map((g) => {
        const mid = (g.channelMin + g.channelMax) / 2;
        const midY = (g.y0 + g.y1) / 2;
        return (
          <Text
            key={g.id}
            style={[
              styles.gateLabel,
              { left: mid * boardScale - 24, top: midY * boardScale - 12, fontSize: 18 * boardScale },
            ]}>
            {`X${g.mult}`}
          </Text>
        );
      })}

      <Animated.Text
        style={[
          styles.cupNumber,
          {
            top: (PLINKO_CUPS.topY + 44) * boardScale,
            marginLeft: -30,
            fontSize: 24 * boardScale,
          },
          topNumStyle,
        ]}>
        {remaining}
      </Animated.Text>

      <Text
        style={[
          styles.cupNumber,
          {
            top: (PLINKO_CUPS.bottomY + 42) * boardScale,
            left: ((PLINKO_CUPS.mouthX0 + PLINKO_CUPS.mouthX1) / 2) * boardScale - 30,
            fontSize: 24 * boardScale,
          },
        ]}>
        {collected}
      </Text>

      {awaitingThrow && (
        <Animated.Text
          style={[
            styles.hint,
            { top: 232 * boardScale, fontSize: 16 * boardScale },
            hintStyle,
          ]}>
          AIM, THEN RELEASE
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gateLabel: {
    position: 'absolute',
    // Visual-only overlays -- must not eat touches meant for the aim gesture
    // (the top cup counter sits right on the cup).
    pointerEvents: 'none',
    width: 48,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: Fonts.nunito,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  cupNumber: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    width: 60,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: Fonts.titan,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  hint: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: Fonts.titan,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
});
