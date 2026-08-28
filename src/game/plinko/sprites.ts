import {
  PaintStyle,
  Skia,
  TileMode,
  useImage,
  type SkImage,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio } from 'react-native';

/**
 * Board art for the pachinko scene -- Figma node 1:1916. One `useImage` per
 * key, same shape as `useBattleSprites`. The board renders its dark base
 * colour underneath until these decode, so a brief null is fine.
 */
const SOURCES = {
  board: require('@/assets/images/plinko/bg-board.webp'),
  cup: require('@/assets/images/plinko/hand-cup.webp'),
  pad: require('@/assets/images/plinko/pad-boost.webp'),
} as const;

export type PlinkoSpriteName = keyof typeof SOURCES;
export type PlinkoSpriteSet = Record<PlinkoSpriteName, SkImage | null>;

export function usePlinkoSprites(): PlinkoSpriteSet {
  /* eslint-disable react-hooks/rules-of-hooks -- fixed key set, not a loop over dynamic data */
  return {
    board: useImage(SOURCES.board),
    cup: useImage(SOURCES.cup),
    pad: useImage(SOURCES.pad),
  };
  /* eslint-enable react-hooks/rules-of-hooks */
}

/**
 * Ball texture for the pachinko `<Atlas>`. Generated once with an offscreen
 * Skia surface rather than shipped as an asset: the ball radius is a tuning
 * value, and a fixed bitmap would either blur (radius smaller than the file)
 * or waste texels (radius larger). Rendering it at exactly the target
 * device-pixel size keeps every size crisp, adds zero bytes to the bundle
 * and has no async-decode `null` window.
 *
 * `icon-ball.webp` is the fallback if `MakeOffscreen` is unavailable.
 */

const BALL_FALLBACK = require('@/assets/images/battle/icon-ball.webp');
/** Cap so an extreme radius on a 3x screen can't ask for a huge surface. */
const MAX_TEXTURE_PX = 96;

export function usePlinkoBallTexture(designRadius: number, boardScale: number): SkImage | null {
  const fallback = useImage(BALL_FALLBACK);

  return useMemo(() => {
    const target = Math.min(MAX_TEXTURE_PX, Math.ceil(designRadius * 2 * boardScale * PixelRatio.get()));
    if (target < 4) return fallback;

    const surface = Skia.Surface.MakeOffscreen(target, target);
    if (!surface) return fallback;

    const canvas = surface.getCanvas();
    const c = target / 2;
    const r = c - 1;

    // Pearl-white ball, matching the design's ball art.
    const body = Skia.Paint();
    body.setAntiAlias(true);
    body.setShader(
      Skia.Shader.MakeRadialGradient(
        Skia.Point(c * 0.68, c * 0.62),
        target,
        [Skia.Color('#FFFFFF'), Skia.Color('#E9E9E9'), Skia.Color('#B9B9B9')],
        [0, 0.55, 1],
        TileMode.Clamp,
      ),
    );
    canvas.drawCircle(c, c, r, body);

    const rim = Skia.Paint();
    rim.setAntiAlias(true);
    rim.setStyle(PaintStyle.Stroke);
    rim.setStrokeWidth(Math.max(1, target * 0.05));
    rim.setColor(Skia.Color('#8A8A8A'));
    canvas.drawCircle(c, c, r, rim);

    const shine = Skia.Paint();
    shine.setAntiAlias(true);
    shine.setColor(Skia.Color('#FFFFFF'));
    shine.setAlphaf(0.85);
    canvas.drawCircle(c * 0.66, c * 0.58, Math.max(1.2, target * 0.13), shine);

    surface.flush();
    const snap = surface.makeImageSnapshot();
    return snap.makeNonTextureImage() ?? snap;
  }, [designRadius, boardScale, fallback]);
}
