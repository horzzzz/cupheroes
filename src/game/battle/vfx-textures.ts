import { Skia, TileMode, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio } from 'react-native';

/**
 * Procedurally-generated textures for the battle VFX layers, rendered once
 * to an offscreen Skia surface -- same technique as `usePlinkoBallTexture`
 * in `game/plinko/sprites.ts` (crisp at any device pixel ratio, zero bundle
 * bytes, no async-decode null window). Both textures are plain white so the
 * `<Atlas>` that draws them can recolour per-instance via its `colors` prop.
 */

const MAX_TEXTURE_PX = 128;

function pxFor(designSize: number, boardScale: number): number {
  return Math.min(MAX_TEXTURE_PX, Math.max(4, Math.ceil(designSize * boardScale * PixelRatio.get())));
}

/** Soft round puff -- a radial gradient fading to transparent, for smoke and dust particles. */
export function usePuffTexture(designDiameter: number, scale: number): SkImage | null {
  return useMemo(() => {
    const target = pxFor(designDiameter, scale);
    const surface = Skia.Surface.MakeOffscreen(target, target);
    if (!surface) return null;

    const canvas = surface.getCanvas();
    const c = target / 2;

    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setShader(
      Skia.Shader.MakeRadialGradient(
        Skia.Point(c, c),
        c,
        [Skia.Color('#FFFFFF'), Skia.Color('#FFFFFF'), Skia.Color('#00FFFFFF')],
        [0, 0.4, 1],
        TileMode.Clamp,
      ),
    );
    canvas.drawCircle(c, c, c, paint);

    surface.flush();
    const snap = surface.makeImageSnapshot();
    return snap.makeNonTextureImage() ?? snap;
  }, [designDiameter, scale]);
}

/** A short horizontal streak, tapered at both ends -- wind lines and ground dust motes. */
export function useStreakTexture(designWidth: number, scale: number): SkImage | null {
  return useMemo(() => {
    const w = pxFor(designWidth, scale);
    const h = Math.max(4, Math.round(w * 0.28));
    const surface = Skia.Surface.MakeOffscreen(w, h);
    if (!surface) return null;

    const canvas = surface.getCanvas();
    const cy = h / 2;

    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setShader(
      Skia.Shader.MakeLinearGradient(
        Skia.Point(0, cy),
        Skia.Point(w, cy),
        [Skia.Color('#00FFFFFF'), Skia.Color('#FFFFFF'), Skia.Color('#FFFFFF'), Skia.Color('#00FFFFFF')],
        [0, 0.3, 0.7, 1],
        TileMode.Clamp,
      ),
    );
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), h / 2, h / 2), paint);

    surface.flush();
    const snap = surface.makeImageSnapshot();
    return snap.makeNonTextureImage() ?? snap;
  }, [designWidth, scale]);
}
