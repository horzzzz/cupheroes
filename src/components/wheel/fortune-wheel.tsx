import { Image } from 'expo-image';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SECTIONS_ASSET = require('@/assets/images/wheel/sections.webp');
const BORDER_ASSET = require('@/assets/images/wheel/border.webp');
const CENTER_ASSET = require('@/assets/images/wheel/center.webp');
const POINTER_ASSET = require('@/assets/images/wheel/pointer.webp');

// Design-frame geometry (390x844 frame, Figma node 1:284) — everything below
// is a fraction of this 310x336 block and gets scaled by `size / BLOCK_WIDTH`.
const BLOCK_WIDTH = 310;
const BLOCK_HEIGHT = 336;
const SECTIONS = { left: 5, top: 31, size: 300 };
const BORDER = { left: 0, top: 26, size: 310 };
const CENTER = { left: 113, top: 139, size: 84 };
const POINTER = { left: 130, top: 0, width: 50, height: 80 };

const SPIN_DURATION = 4200;
const SPIN_TURNS = 5;

export type WheelSectorType = 'coin' | 'gem' | 'exp';

export type WheelSector = {
  key: string;
  type: WheelSectorType;
  value: number;
  /** Clockwise angle (degrees) from 12 o'clock where the sector's prize sits, measured in Figma. */
  angle: number;
};

/**
 * The six wedges baked into `sections.webp`, clockwise from 12 o'clock.
 * Angles come from the prize icons' rotation transforms in Figma (node
 * 1:285) — they land a few degrees off a perfect 60° grid, which is what
 * actually lines up with the gold dividers painted into the artwork.
 */
export const WHEEL_SECTORS: WheelSector[] = [
  { key: 'exp-90', type: 'exp', value: 90, angle: 0 },
  { key: 'coin-250', type: 'coin', value: 250, angle: 59.28 },
  { key: 'gem-1', type: 'gem', value: 1, angle: 121.41 },
  { key: 'exp-200', type: 'exp', value: 200, angle: 181.47 },
  { key: 'gem-3', type: 'gem', value: 3, angle: 240.44 },
  { key: 'coin-50', type: 'coin', value: 50, angle: 302.29 },
];

/** Always-positive modulo (`%` keeps JS's sign, which breaks the wrap-around math below). */
const mod360 = (deg: number) => ((deg % 360) + 360) % 360;

export type FortuneWheelHandle = {
  /** Spins to a random sector; resolves once the wheel has fully stopped. */
  spin: () => void;
};

type FortuneWheelProps = {
  /** Width of the wheel block, in design px — defaults to the Figma frame's own 310. */
  size?: number;
  onSpinStart?: () => void;
  onSpinEnd?: (sector: WheelSector) => void;
};

/**
 * The wheel screen's centerpiece — Figma node 1:284. Only the sectors disc
 * spins; the gold border ring, the center hub, and the pointer are separate,
 * absolutely-positioned layers that never move, matching how the design
 * splits them into standalone Figma nodes (1:326 / 1:332 / 1:336).
 */
export const FortuneWheel = forwardRef<FortuneWheelHandle, FortuneWheelProps>(
  function FortuneWheel({ size = BLOCK_WIDTH, onSpinStart, onSpinEnd }, ref) {
    const k = size / BLOCK_WIDTH;
    const rotation = useSharedValue(0);
    const spinningRef = useRef(false);

    const sectionsStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    useImperativeHandle(ref, () => ({
      spin: () => {
        if (spinningRef.current) return;
        spinningRef.current = true;
        onSpinStart?.();

        const index = Math.floor(Math.random() * WHEEL_SECTORS.length);
        const sector = WHEEL_SECTORS[index];
        const delta = mod360(-sector.angle - rotation.value);
        const target = rotation.value + 360 * SPIN_TURNS + delta;

        const finish = () => {
          spinningRef.current = false;
          onSpinEnd?.(sector);
        };
        rotation.value = withTiming(
          target,
          { duration: SPIN_DURATION, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(finish)();
          },
        );
      },
    }));

    return (
      <View style={{ width: BLOCK_WIDTH * k, height: BLOCK_HEIGHT * k }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: SECTIONS.left * k,
              top: SECTIONS.top * k,
              width: SECTIONS.size * k,
              height: SECTIONS.size * k,
            },
            sectionsStyle,
          ]}>
          <Image source={SECTIONS_ASSET} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        </Animated.View>

        <Image
          source={BORDER_ASSET}
          style={{
            position: 'absolute',
            left: BORDER.left * k,
            top: BORDER.top * k,
            width: BORDER.size * k,
            height: BORDER.size * k,
          }}
          contentFit="contain"
        />

        <Image
          source={CENTER_ASSET}
          style={{
            position: 'absolute',
            left: CENTER.left * k,
            top: CENTER.top * k,
            width: CENTER.size * k,
            height: CENTER.size * k,
          }}
          contentFit="contain"
        />

        <Image
          source={POINTER_ASSET}
          style={{
            position: 'absolute',
            left: POINTER.left * k,
            top: POINTER.top * k,
            width: POINTER.width * k,
            height: POINTER.height * k,
          }}
          contentFit="contain"
        />
      </View>
    );
  },
);
