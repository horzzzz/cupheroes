import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { playSfx } from '@/game/audio/engine';

const TRACK_HEIGHT = 8;
const THUMB_SIZE = 14;
const HIT_AREA_HEIGHT = 32;
// Values within this fraction of an edge snap to exactly 0/1 -- the thumb's
// own radius makes the literal edge unreachable by touch alone, and audio
// (music especially) needs a real 0 to actually go silent, not "1%" that
// still plays quietly (see `game/audio/engine.ts`'s volume setters).
const EDGE_SNAP = 0.04;

type VolumeSliderProps = {
  /** 0..1 */
  value: number;
  onChange: (value: number) => void;
};

/**
 * Draggable music/sound bar — Figma nodes 1:2204-1:2209. The hit area is
 * taller than the visible 8px track so the 14px thumb stays easy to grab.
 *
 * Tracks the finger as a *delta* from wherever the thumb already sits
 * (`gestureState.dx`), not by converting the touch's absolute screen
 * position into a track-relative one. An earlier version did the latter via
 * `measureInWindow`, which resolves asynchronously — grabbing the thumb
 * before that measurement (or a safe-area-driven relayout) settled read a
 * stale container offset and sent the thumb flying to one end, then
 * fighting between that and the real finger position once the measurement
 * caught up. `dx` is relative to the gesture's own start and needs no
 * measurement at all, so there's nothing left to race.
 */
export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startValueRef = useRef(value);
  // Always current, so `onPanResponderGrant` (set once per gesture) reads
  // the live prop instead of a stale closure from when the responder was built.
  const valueRef = useRef(value);
  valueRef.current = value;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
        playSfx('ui-click');
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!widthRef.current) return;
        const raw = startValueRef.current + gestureState.dx / widthRef.current;
        onChange(snapToEdge(Math.min(1, Math.max(0, raw))));
      },
      // Grab and release only -- a tick per move event would machine-gun.
      // The release one matters most on the SOUND slider: it plays at the
      // level just chosen, so it doubles as an audition of the new setting
      // (and its absence is the confirmation that you dragged to zero).
      onPanResponderRelease: () => {
        playSfx('ui-click');
      },
    })
  ).current;

  return (
    <View
      style={styles.hitArea}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      {...responder.panHandlers}>
      <View style={styles.track}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.thumb, { left: value * width - THUMB_SIZE / 2 }]} />
    </View>
  );
}

function snapToEdge(value: number): number {
  if (value <= EDGE_SNAP) return 0;
  if (value >= 1 - EDGE_SNAP) return 1;
  return value;
}

const styles = StyleSheet.create({
  hitArea: {
    height: HIT_AREA_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.darkPanel,
  },
});
