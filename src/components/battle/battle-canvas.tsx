import { Canvas, Group } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { BallDrop } from '@/components/battle/ball-drop';
import { BattleActors } from '@/components/battle/battle-actors';
import { BattleBackground } from '@/components/battle/battle-background';
import { BattleFrame } from '@/constants/battle';
import { chapterTheme } from '@/constants/chapters';
import type { GameClock } from '@/game/clock';
import { isSpriteSetReady, useBattleSprites } from '@/game/sprites';

type BattleCanvasProps = {
  clock: GameClock;
  scale: number;
  /** This run's chapter -- selects the location's background + enemy art. */
  chapter: number;
  onReady?: (ready: boolean) => void;
};

/**
 * Hosts every Skia-drawn layer of the battle scene (background, actors,
 * flying balls). HUD, health bars and damage numbers are plain RN views
 * layered on top by the screen -- see the battle plan doc for why the split
 * sits there.
 */
export function BattleCanvas({ clock, scale, chapter, onReady }: BattleCanvasProps) {
  const sprites = useBattleSprites(chapter);
  const ready = isSpriteSetReady(sprites);

  useEffect(() => {
    onReady?.(ready);
  }, [ready, onReady]);

  return (
    <Canvas
      style={[
        styles.canvas,
        { width: BattleFrame.width * scale, height: BattleFrame.canvasHeight * scale },
      ]}>
      {/* Every layer below draws in fixed 390x484 design coordinates; this
          is the one place device scale is applied, so Skia rasterizes
          straight to the target resolution instead of stretching a bitmap. */}
      <Group transform={[{ scale }]}>
        <BattleBackground sprites={sprites} placeholderColor={chapterTheme(chapter).groundColor} />
        {ready && <BattleActors clock={clock} sprites={sprites} />}
        {ready && <BallDrop clock={clock} sprites={sprites} />}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
  },
});
