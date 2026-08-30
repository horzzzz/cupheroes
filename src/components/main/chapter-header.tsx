import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { chapterTheme } from '@/constants/chapters';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';

/**
 * "CHAPTER n" over the location's name. `chapter` is the ever-growing counter
 * from the economy store; the name cycles every 4 (see `constants/chapters`),
 * so chapter 5 reads "CHAPTER 5 / Whispering Groves".
 */
export function ChapterHeader({ chapter }: { chapter: number }) {
  return (
    <View style={{ alignItems: 'center', gap: 16, marginTop: 40 }}>
      <GameText
        style={{
          textTransform: 'uppercase',
          fontFamily: Fonts.titan,
          fontSize: 24,
          color: Colors.white,
        }}>
        {`Chapter ${chapter}`}
      </GameText>
      <GameText
        gradient
        style={{ textTransform: 'uppercase', fontFamily: Fonts.titan, fontSize: 18 }}>
        {chapterTheme(chapter).name}
      </GameText>
    </View>
  );
}
