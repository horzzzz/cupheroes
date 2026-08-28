import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { SKILLS, skillLabelAt } from '@/constants/skills';
import type { SkillOffer } from '@/game/battle/skills';

const STAR_FULL = require('@/assets/images/ui/star-full.webp');
const STAR_EMPTY = require('@/assets/images/ui/star-empty.webp');

/** One skill card from the draft (Figma instance 1:1896): 110x200, icon, label, rarity stars. */
export function SkillCard({ offer, scale }: { offer: SkillOffer; scale: number }) {
  const def = SKILLS[offer.id];
  const owned = offer.level - 1;

  return (
    <View style={{ width: 110 * scale, height: 200 * scale }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 10 * scale,
          backgroundColor: '#0a3061',
          borderWidth: 1,
          borderColor: '#250404',
        }}
      />
      <LinearGradient
        colors={['#1e5193', '#0051b9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: 2 * scale,
          top: 2 * scale,
          width: 106 * scale,
          height: 190 * scale,
          borderRadius: 8 * scale,
        }}
      />

      <Image
        source={def.icon}
        style={{ position: 'absolute', left: 10 * scale, top: 5 * scale, width: 90 * scale, height: 90 * scale }}
        contentFit="contain"
      />

      <View
        style={{
          position: 'absolute',
          left: 5 * scale,
          top: 96 * scale,
          width: 100 * scale,
          height: 64 * scale,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <GameText
          style={{
            fontFamily: Fonts.nunito,
            fontSize: 12 * scale,
            lineHeight: 14 * scale,
            color: '#ffffff',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}>
          {skillLabelAt(offer.id, offer.level)}
        </GameText>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 164 * scale,
          width: 110 * scale,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {Array.from({ length: def.maxLevel }, (_, i) => (
          <Image
            key={i}
            source={i < owned ? STAR_FULL : STAR_EMPTY}
            style={{ width: 17 * scale, height: 17 * scale }}
            contentFit="contain"
          />
        ))}
      </View>
    </View>
  );
}
