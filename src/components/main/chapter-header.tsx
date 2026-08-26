import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { useDesignScale } from '@/hooks/use-design-scale';

// Hardcoded placeholder copy — real chapter data comes later.
const CHAPTER_LABEL = 'CHAPTER 1';
const CHAPTER_NAME = 'Whispering Groves';

const TITLE_CENTER_Y = 175.5;
const SUBTITLE_CENTER_Y = 219.5;
const WIDTH = 248;

/** "CHAPTER 1 / Whispering Groves" heading — Figma nodes 1:29-1:30. */
export function ChapterHeader() {
  const { width, sy, s } = useDesignScale();
  const boxWidth = WIDTH * s;
  const boxLeft = width / 2 - boxWidth / 2;

  return (
    <View>
      <View
        style={{
          position: 'absolute',
          left: boxLeft,
          top: TITLE_CENTER_Y * sy - (24 * s) / 2,
          width: boxWidth,
        }}>
        <GameText
          style={{
            textAlign: 'center',
            textTransform: 'uppercase',
            fontFamily: Fonts.titan,
            fontSize: 24 * s,
            color: Colors.white,
          }}>
          {CHAPTER_LABEL}
        </GameText>
      </View>
      <View
        style={{
          position: 'absolute',
          left: boxLeft,
          top: SUBTITLE_CENTER_Y * sy - (18 * s) / 2,
          width: boxWidth,
        }}>
        <GameText
          gradient
          style={{
            textAlign: 'center',
            textTransform: 'uppercase',
            fontFamily: Fonts.titan,
            fontSize: 18 * s,
          }}>
          {CHAPTER_NAME}
        </GameText>
      </View>
    </View>
  );
}
