import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

const TRACK_HEIGHT = 8;
const THUMB_SIZE = 14;
const HIT_AREA_HEIGHT = 32;

type VolumeSliderProps = {
  /** 0..1 */
  value: number;
  onChange: (value: number) => void;
};

/**
 * Draggable music/sound bar — Figma nodes 1:2204-1:2209. The hit area is
 * taller than the visible 8px track so the 14px thumb stays easy to grab.
 */
export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateFromTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateFromTouch(evt.nativeEvent.locationX),
    })
  ).current;

  function updateFromTouch(x: number) {
    if (!widthRef.current) return;
    onChange(Math.min(1, Math.max(0, x / widthRef.current)));
  }

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
