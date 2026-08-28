import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

const CUP_ICON = require('@/assets/images/battle/icon-cup.webp');

/**
 * The wave status bar -- Figma node 1:1284, measured pixel-for-pixel off
 * `get_screenshot`: a white pill (194x24 box, 190x10 track at top7, radius5)
 * with three Ø18 checkpoint dots (top3) at x=9/94.5/180, one per pack --
 * two packs per wave plus the cup at the end, per `HALVES_PER_WAVE`. The red
 * fill is a flat color (no gradient), inset 2pt inside the track/dots on
 * every side: a 6pt bar plus a Ø14 disc at every checkpoint it's reached.
 * The boss wave is a single pack, so its bar only shows the start and end
 * checkpoints -- no dot to reach halfway through a fight that isn't split.
 *
 * The cup at the end IS the terminal marker -- no white dot or red disc is
 * drawn there, and the fill stops just under the cup's left edge, so neither
 * the bar's rounded tip nor a disc pokes out past the cup silhouette.
 */

const WIDTH = 194;
const HEIGHT = 24;
const TRACK_HEIGHT = 10;
const TRACK_TOP = 7;
const TRACK_RADIUS = 5;
const DOT_SIZE = 18;
const DOT_TOP = 3;
const START_X = 9;
const END_X = 180;
const MID_X = 94.5;
const FILL_LEFT = 2;
const FILL_TOP = 9;
const FILL_HEIGHT = 6;
const FILL_RADIUS = 3;
const DISC_SIZE = 14;
const DISC_TOP = 5;
const CUP_SIZE = 24;
/** Right edge for the white track and the red fill -- tucked under the cup's
 * narrow base so neither rounded tip pokes out past the cup silhouette. The
 * cup itself is opaque over the rest, so the track visually still reaches it. */
const BAR_MAX_X = END_X - 6;
const TRACK_WIDTH = BAR_MAX_X;

const STROKE = { borderWidth: 1, borderColor: Colors.darkPanel } as const;

type WaveProgressProps = {
  scale: number;
  /** 0..1 fraction of the wave cleared -- see `waveProgress` in the battle store. */
  progress: number;
  /** False on the boss wave, which is a single pack with no midpoint to mark. */
  hasMidCheckpoint: boolean;
};

export function WaveProgress({ scale, progress, hasMidCheckpoint }: WaveProgressProps) {
  const p = useSharedValue(progress);

  useEffect(() => {
    p.value = withTiming(progress, { duration: 250 });
  }, [progress, p]);

  const fillStyle = useAnimatedStyle(() => {
    const leadX = Math.min(BAR_MAX_X - 1, START_X + (END_X - START_X) * p.value);
    return { width: Math.max(0, (leadX - FILL_LEFT) * scale) };
  });

  // The cup is the end marker -- START and (on non-boss waves) the midpoint are
  // the only drawn dots/discs.
  const checkpoints = hasMidCheckpoint ? [START_X, MID_X] : [START_X];

  return (
    <View style={{ width: WIDTH * scale, height: HEIGHT * scale }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: TRACK_TOP * scale,
          width: TRACK_WIDTH * scale,
          height: TRACK_HEIGHT * scale,
          borderRadius: TRACK_RADIUS * scale,
          backgroundColor: Colors.white,
          ...STROKE,
        }}
      />
      {checkpoints.map((cx) => (
        <View
          key={`dot-${cx}`}
          style={{
            position: 'absolute',
            left: (cx - DOT_SIZE / 2) * scale,
            top: DOT_TOP * scale,
            width: DOT_SIZE * scale,
            height: DOT_SIZE * scale,
            borderRadius: (DOT_SIZE / 2) * scale,
            backgroundColor: Colors.white,
            ...STROKE,
          }}
        />
      ))}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: FILL_LEFT * scale,
            top: FILL_TOP * scale,
            height: FILL_HEIGHT * scale,
            borderRadius: FILL_RADIUS * scale,
            backgroundColor: '#FF3747',
          },
          fillStyle,
        ]}
      />
      {checkpoints
        .filter((cx) => progress >= (cx - START_X) / (END_X - START_X))
        .map((cx) => (
          <View
            key={`disc-${cx}`}
            style={{
              position: 'absolute',
              left: (cx - DISC_SIZE / 2) * scale,
              top: DISC_TOP * scale,
              width: DISC_SIZE * scale,
              height: DISC_SIZE * scale,
              borderRadius: (DISC_SIZE / 2) * scale,
              backgroundColor: '#FF3747',
            }}
          />
        ))}
      <Image
        source={CUP_ICON}
        style={{
          position: 'absolute',
          left: (END_X - CUP_SIZE / 2) * scale,
          top: 0,
          width: CUP_SIZE * scale,
          height: CUP_SIZE * scale,
        }}
        contentFit="contain"
      />
    </View>
  );
}
