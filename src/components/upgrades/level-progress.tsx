import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { LevelBadge } from '@/components/upgrades/level-badge';
import { Colors } from '@/constants/theme';

const BADGE_SIZE = 36;
const TRACK_LEFT = 8;
const TRACK_TOP = 3;
const TRACK_WIDTH = 202;
const TRACK_HEIGHT = 30;
const FILL_INSET = 2;

type LevelProgressProps = {
  level: number;
  /** 0..1 of the way to the next level. */
  progress: number;
};

/**
 * Player level and XP bar — Figma node 1:1155. The badge overlaps the track's
 * left end, so it is drawn after it.
 */
export function LevelProgress({ level, progress }: LevelProgressProps) {
  const fillWidth = (TRACK_WIDTH - FILL_INSET * 2) * Math.min(Math.max(progress, 0), 1);

  return (
    <View style={{ height: BADGE_SIZE }}>
      <View
        style={{
          position: 'absolute',
          left: TRACK_LEFT,
          top: TRACK_TOP,
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: Colors.darkPanel,
          opacity: 0.65,
        }}>
        <LinearGradient
          colors={[Colors.progressGreenStart, Colors.progressGreenEnd]}
          locations={[0.48309, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            left: FILL_INSET,
            top: FILL_INSET,
            width: fillWidth,
            height: TRACK_HEIGHT - FILL_INSET * 2,
            borderRadius: (TRACK_HEIGHT - FILL_INSET * 2) / 2,
          }}
        />
      </View>

      <LevelBadge level={level} size={BADGE_SIZE} />
    </View>
  );
}
