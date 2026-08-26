import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

// Hardcoded placeholder copy — real chapter data comes later.
const CHAPTER_LABEL = 'CHAPTER 1';
const CHAPTER_NAME = 'Whispering Groves';

export function ChapterHeader() {
  return (
    <View style={{ alignItems: 'center', gap: 16, marginTop: 40 }}>
      <GameText
        style={{
          textTransform: 'uppercase',
          fontFamily: Fonts.titan,
          fontSize: 24,
          color: Colors.white,
        }}>
        {CHAPTER_LABEL}
      </GameText>
      <GameText
        gradient
        style={{ textTransform: 'uppercase', fontFamily: Fonts.titan, fontSize: 18 }}>
        {CHAPTER_NAME}
      </GameText>
    </View>
  );
}
