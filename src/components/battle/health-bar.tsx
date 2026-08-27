import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { GameText } from '@/components/ui/game-text';
import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/theme';
import { healthAt, moveOffsetAt } from '@/game/battle/actor-layout';
import type { AttackBeat, MoveBeat } from '@/game/battle/combat';
import type { GameClock } from '@/game/clock';

/**
 * One health bar, positioned in absolute design points and scaled like the
 * battle canvas below it (see `battle.tsx`) so the two layers line up. Kept
 * as plain RN views rather than Skia -- the bar sits at a fixed slot
 * position regardless of the sprite's own idle bob/lunge, so there's no
 * per-frame sync needed with the canvas, just a width tween on health
 * changes. Both `left` and the fill width are read off the game clock every
 * frame (via `moveOffsetAt`/`healthAt`) rather than off the `health`/`standX`
 * props directly -- the store commits a round's outcome all at once, but the
 * beats that produced it (this actor's approach step, the hit that dealt the
 * damage) play out staggered across the round, so reading the props straight
 * would move the bar (or drop its fill) before the actor's own beat does.
 */

const BAR_HEIGHT = 16;
const TRACK_HEIGHT = 10;
const FILL_HEIGHT = 8;
const TRACK_TOP = 3;
const FILL_INSET = 1;
const BADGE_SIZE = 16;

const HERO_FILL: [string, string] = ['#0dff00', '#00b421'];
const ENEMY_FILL: [string, string] = ['#ff0000', '#b40000'];

type HealthBarProps = {
  clock: GameClock;
  /** Resting/target x -- what `moveOffsetAt` falls back to once `moveBeat` (if any) has finished. */
  standX: number;
  /** Constant nudge applied after `moveOffsetAt` (e.g. centering an enemy bar under its narrower box). */
  offsetX?: number;
  y: number;
  width: number;
  scale: number;
  health: number;
  maxHealth: number;
  variant: 'hero' | 'enemy';
  armor?: number;
  moveBeat?: MoveBeat;
  /** This round's attack beats that hit this actor, oldest first -- see `healthAt`. Empty/undefined
   * when nothing hit it this round, in which case `health` (unchanged from last round) is shown as-is. */
  hitBeats?: readonly AttackBeat[];
  /** Game-clock time this bar should pop in -- e.g. an entering enemy's run-in finish, so the bar
   * doesn't sit at the resting slot while the sprite is still visibly running in from off-screen. */
  revealAt?: number;
};

export function HealthBar({
  clock,
  standX,
  offsetX = 0,
  y,
  width,
  scale,
  health,
  maxHealth,
  variant,
  armor,
  moveBeat,
  hitBeats,
  revealAt,
}: HealthBarProps) {
  const displayHealth = useDerivedValue(() =>
    Math.max(0, healthAt(clock.time.value, hitBeats ?? [], health)),
  );
  const fillStyle = useAnimatedStyle(() => ({
    width: `${(maxHealth > 0 ? displayHealth.value / maxHealth : 0) * 100}%`,
  }));
  const left = useDerivedValue(() => (moveOffsetAt(clock.time.value, standX, moveBeat) + offsetX) * scale);
  const positionStyle = useAnimatedStyle(() => ({
    left: left.value,
    opacity: revealAt === undefined || clock.time.value >= revealAt ? 1 : 0,
  }));

  // The number inside the bar is plain RN text (no reanimated content
  // binding for that), so it's kept as ordinary state -- but updated from
  // the same clock-driven value as the bar, only on the whole-number
  // changes that actually matter, so it lands in step with the bar instead
  // of jumping the instant the round resolves.
  const [displayedText, setDisplayedText] = useState(() => Math.max(0, Math.round(health)));
  useAnimatedReaction(
    () => Math.round(displayHealth.value),
    (rounded, previous) => {
      if (rounded !== previous) runOnJS(setDisplayedText)(rounded);
    },
  );

  return (
    <Animated.View
      style={[{ position: 'absolute', top: y * scale, width: width * scale, height: BAR_HEIGHT * scale }, positionStyle]}>
      <View
        style={{
          position: 'absolute',
          top: TRACK_TOP * scale,
          left: 0,
          width: width * scale,
          height: TRACK_HEIGHT * scale,
          borderRadius: (TRACK_HEIGHT / 2) * scale,
          backgroundColor: Colors.trackBackground,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: (TRACK_TOP + FILL_INSET) * scale,
            left: FILL_INSET * scale,
            height: FILL_HEIGHT * scale,
            borderRadius: (FILL_HEIGHT / 2) * scale,
            overflow: 'hidden',
          },
          fillStyle,
        ]}>
        <LinearGradient
          colors={variant === 'hero' ? HERO_FILL : ENEMY_FILL}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <GameText
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: BAR_HEIGHT * scale,
          textAlign: 'center',
          textAlignVertical: 'center',
          fontFamily: Fonts.nunito,
          fontSize: 12 * scale,
          color: Colors.white,
        }}>
        {displayedText}
      </GameText>
      {variant === 'hero' && armor !== undefined && (
        <View
          style={{
            position: 'absolute',
            left: -(BADGE_SIZE / 2) * scale,
            top: 0,
            width: BADGE_SIZE * scale,
            height: BADGE_SIZE * scale,
            borderRadius: (BADGE_SIZE / 2) * scale,
            backgroundColor: '#0294fa',
            borderWidth: 1,
            borderColor: Colors.darkPanel,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <GameText style={{ fontFamily: Fonts.nunito, fontSize: 10 * scale, color: Colors.white }}>{armor}</GameText>
        </View>
      )}
    </Animated.View>
  );
}
